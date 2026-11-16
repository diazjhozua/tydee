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
            user.IsEmailVerified = verified;

            if (verified)
            {
                user.EmailVerificationToken = null;
                user.EmailVerificationTokenExpiresAt = null;
            }
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
            else
            {
                // Unlock also clears the failed-login lockout. This is the only
                // admin path that ends a 15-minute failed-login lock.
                user.LockoutEndUtc = null;
                user.FailedLoginAttempts = 0;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        await userLock.CommitAsync(cancellationToken);

        return Result.Success();
    }
}
