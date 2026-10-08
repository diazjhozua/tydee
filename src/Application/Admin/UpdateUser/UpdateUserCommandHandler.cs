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
    private const int LockoutMinutes = 525600; // 1 year; effectively indefinite.

    public async Task<Result> Handle(UpdateUserCommand command, CancellationToken cancellationToken)
    {
        User? user = await context.Users
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
            if (locked)
            {
                user.LockoutEndUtc = dateTimeProvider.UtcNow.AddMinutes(LockoutMinutes);
            }
            else
            {
                user.LockoutEndUtc = null;
                user.FailedLoginAttempts = 0;
            }
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}