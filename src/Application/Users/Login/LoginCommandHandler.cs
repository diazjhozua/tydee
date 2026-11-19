using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Login;

internal sealed class LoginCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider,
    IAdminProvider adminProvider,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<LoginCommand, AuthTokensResponse>
{
    private const int RefreshTokenLifetimeDays = 7;
    private const int AccessTokenLifetimeMinutes = 15;

    public async Task<Result<AuthTokensResponse>> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();

        // Taken before the user is read, so an admin lock that commits meanwhile is
        // seen here, and no token is issued after it. Every write is committed through it.
        await using IUserLock userLock = await context.LockUserByEmailAsync(email, cancellationToken);

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

        // Unknown and admin-locked accounts answer exactly like a wrong password. They also pay
        // the same hash cost, so response time doesn't reveal whether the account exists or is locked.
        if (user is null || user.IsLocked)
        {
            _ = passwordHasher.Hash(command.Password);

            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidCredentials);
        }

        // A wrong password writes nothing. Disposing the lock without a commit rolls back.
        if (!passwordHasher.Verify(command.Password, user.PasswordHash))
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidCredentials);
        }

        if (!user.IsEmailVerified)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.EmailNotVerified);
        }

        // The config allowlist can grant admin on login; it never revokes, so a
        // manually flipped DB flag is not clobbered by a stale allowlist entry.
        if (adminProvider.IsAdmin(user.Email))
        {
            user.IsAdmin = true;
        }

        user.RefreshTokens.RemoveAll(t => t.IsExpired(dateTimeProvider.UtcNow));

        string rawRefreshToken = tokenProvider.GenerateRefreshToken();

        // Add through the DbSet so EF tracks it as an insert; adding via the
        // navigation with a pre-set Guid key makes it issue an update instead.
        context.RefreshTokens.Add(new Domain.Users.RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = tokenProvider.HashRefreshToken(rawRefreshToken),
            UserId = user.Id,
            ExpiresOnUtc = dateTimeProvider.UtcNow.AddDays(RefreshTokenLifetimeDays),
        });

        await context.SaveChangesAsync(cancellationToken);
        await userLock.CommitAsync(cancellationToken);

        string accessToken = tokenProvider.CreateAccessToken(user);

        return new AuthTokensResponse(
            accessToken,
            rawRefreshToken,
            dateTimeProvider.UtcNow.AddMinutes(AccessTokenLifetimeMinutes));
    }
}
