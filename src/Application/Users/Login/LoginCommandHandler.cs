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
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<LoginCommand, AuthTokensResponse>
{
    private const int RefreshTokenLifetimeDays = 7;
    private const int AccessTokenLifetimeMinutes = 15;

    public async Task<Result<AuthTokensResponse>> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null || !passwordHasher.Verify(command.Password, user.PasswordHash))
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidCredentials);
        }

        if (!user.IsEmailVerified)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.EmailNotVerified);
        }

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
