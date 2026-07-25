using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Users.Login;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.RefreshToken;

internal sealed class RefreshTokenCommandHandler(
    IApplicationDbContext context,
    ITokenProvider tokenProvider,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<RefreshTokenCommand, AuthTokensResponse>
{
    private const int RefreshTokenLifetimeDays = 7;
    private const int AccessTokenLifetimeMinutes = 15;

    public async Task<Result<AuthTokensResponse>> Handle(RefreshTokenCommand command, CancellationToken cancellationToken)
    {
        string hashedToken = tokenProvider.HashRefreshToken(command.RefreshToken);

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(
                u => u.RefreshTokens.Any(t => t.Token == hashedToken),
                cancellationToken);

        Domain.Users.RefreshToken? existingToken = user?.RefreshTokens
            .SingleOrDefault(t => t.Token == hashedToken);

        if (user is null || existingToken is null)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidRefreshToken);
        }

        // A revoked token coming back means it was likely stolen after
        // rotation, so kill every active session for this user.
        if (existingToken.RevokedAt is not null)
        {
            foreach (Domain.Users.RefreshToken token in user.RefreshTokens.Where(t => t.IsActive))
            {
                token.RevokedAt = dateTimeProvider.UtcNow;
            }

            await context.SaveChangesAsync(cancellationToken);

            return Result.Failure<AuthTokensResponse>(UserErrors.TokenReuseDetected);
        }

        if (existingToken.IsExpired)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidRefreshToken);
        }

        existingToken.RevokedAt = dateTimeProvider.UtcNow;

        user.RefreshTokens.RemoveAll(t => t.IsExpired);

        string rawRefreshToken = tokenProvider.GenerateRefreshToken();

        user.RefreshTokens.Add(new Domain.Users.RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = tokenProvider.HashRefreshToken(rawRefreshToken),
            UserId = user.Id,
            ExpiresOnUtc = dateTimeProvider.UtcNow.AddDays(RefreshTokenLifetimeDays),
        });

        await context.SaveChangesAsync(cancellationToken);

        string accessToken = tokenProvider.CreateAccessToken(user);

        return new AuthTokensResponse(
            accessToken,
            rawRefreshToken,
            dateTimeProvider.UtcNow.AddMinutes(AccessTokenLifetimeMinutes));
    }
}
