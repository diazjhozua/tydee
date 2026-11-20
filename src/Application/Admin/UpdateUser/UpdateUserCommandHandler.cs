using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Admin.UpdateUser;

internal sealed class UpdateUserCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<UpdateUserCommand>
{
    public async Task<Result> Handle(UpdateUserCommand command, CancellationToken cancellationToken)
    {
        if (command.IsLocked is true && command.UserId == command.AdminUserId)
        {
            return Result.Failure(UserErrors.CannotLockSelf);
        }

        // Taken before the user is read. A login or refresh that holds the row
        // finishes first, so its new token is already visible when sessions are revoked.
        await using IUserLock userLock = await context.LockUserByIdAsync(command.UserId, cancellationToken);

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Id == command.UserId, cancellationToken);

        if (user is null)
        {
            return Result.Failure(UserErrors.NotFound);
        }

        if (command.IsEmailVerified is { } verified)
        {
            // Verifying by hand doesn't prove the owner chose the registration password, so it is dropped.
            // The owner sets one through Forgot password. Accounts that are already verified keep theirs.
            if (verified && !user.IsEmailVerified)
            {
                user.PasswordHash = string.Empty;

                EmailVerification? verification = await context.EmailVerifications
                    .SingleOrDefaultAsync(v => v.UserId == user.Id, cancellationToken);

                if (verification is not null)
                {
                    context.EmailVerifications.Remove(verification);
                }
            }

            user.IsEmailVerified = verified;
        }

        if (command.IsLocked is { } locked)
        {
            user.IsLocked = locked;

            if (locked)
            {
                // Ends every session now. Login and refresh also check IsLocked,
                // and the JWT validator rejects the access token on each request.
                user.RevokeActiveSessions(dateTimeProvider.UtcNow);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        await userLock.CommitAsync(cancellationToken);

        return Result.Success();
    }
}
