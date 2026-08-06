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

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.PasswordResetTokenHash == tokenHash, cancellationToken);

        if (user is null || user.PasswordResetTokenExpiresAt < dateTimeProvider.UtcNow)
        {
            return Result.Failure(UserErrors.InvalidResetToken);
        }

        user.PasswordHash = passwordHasher.Hash(command.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiresAt = null;
        user.FailedLoginAttempts = 0;
        user.LockoutEndUtc = null;

        // Whoever reset the password should be the only one left logged in,
        // so every existing session gets revoked.
        foreach (Domain.Users.RefreshToken token in user.RefreshTokens.Where(t => t.IsActive(dateTimeProvider.UtcNow)))
        {
            token.RevokedAt = dateTimeProvider.UtcNow;
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
