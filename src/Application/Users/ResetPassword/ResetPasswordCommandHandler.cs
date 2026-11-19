using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ResetPassword;

internal sealed class ResetPasswordCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<ResetPasswordCommand>
{
    public async Task<Result> Handle(ResetPasswordCommand command, CancellationToken cancellationToken)
    {
        string tokenHash = tokenProvider.HashRefreshToken(command.Token);

        // Find the owner first, so the row lock is taken before the user is read.
        Guid? ownerId = await context.Users
            .Where(u => u.PasswordResetTokenHash == tokenHash)
            .Select(u => (Guid?)u.Id)
            .SingleOrDefaultAsync(cancellationToken);

        if (ownerId is null)
        {
            return Result.Failure(UserErrors.InvalidResetToken);
        }

        await using IUserLock userLock = await context.LockUserByIdAsync(ownerId.Value, cancellationToken);

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.PasswordResetTokenHash == tokenHash, cancellationToken);

        if (user is null || user.PasswordResetTokenExpiresAt < dateTimeProvider.UtcNow)
        {
            return Result.Failure(UserErrors.InvalidResetToken);
        }

        // An admin-locked account can't reset. The link is consumed, so it doesn't
        // work again if the account is unlocked before it expires.
        if (user.IsLocked)
        {
            user.PasswordResetTokenHash = null;
            user.PasswordResetTokenExpiresAt = null;

            await context.SaveChangesAsync(cancellationToken);
            await userLock.CommitAsync(cancellationToken);

            return Result.Failure(UserErrors.InvalidResetToken);
        }

        user.PasswordHash = passwordHasher.Hash(command.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiresAt = null;

        // Whoever reset the password should be the only one left logged in,
        // so every existing session gets revoked.
        user.RevokeActiveSessions(dateTimeProvider.UtcNow);

        await context.SaveChangesAsync(cancellationToken);
        await userLock.CommitAsync(cancellationToken);

        return Result.Success();
    }
}
