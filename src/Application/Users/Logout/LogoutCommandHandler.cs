using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Logout;

internal sealed class LogoutCommandHandler(
    IApplicationDbContext context,
    ITokenProvider tokenProvider,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<LogoutCommand>
{
    public async Task<Result> Handle(LogoutCommand command, CancellationToken cancellationToken)
    {
        string hashedToken = tokenProvider.HashRefreshToken(command.RefreshToken);

        // Any token the user ever held identifies them, including one already rotated
        // away. An unknown token ends nothing.
        Guid? ownerId = await context.RefreshTokens
            .Where(t => t.Token == hashedToken)
            .Select(t => (Guid?)t.UserId)
            .SingleOrDefaultAsync(cancellationToken);

        if (ownerId is null)
        {
            return Result.Success();
        }

        // Same lock as refresh, so a refresh that is still running finishes first and
        // its new token is revoked here too.
        await using IUserLock userLock = await context.LockUserByIdAsync(ownerId.Value, cancellationToken);

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Id == ownerId.Value, cancellationToken);

        if (user is null)
        {
            return Result.Success();
        }

        user.RevokeActiveSessions(dateTimeProvider.UtcNow);

        await context.SaveChangesAsync(cancellationToken);
        await userLock.CommitAsync(cancellationToken);

        return Result.Success();
    }
}
