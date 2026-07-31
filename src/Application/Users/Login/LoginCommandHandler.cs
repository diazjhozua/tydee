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
    private const int MaxFailedLoginAttempts = 5;
    private const int LockoutMinutes = 15;

    public async Task<Result<AuthTokensResponse>> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();

        User? user = await context.Users
            .Include(u => u.RefreshTokens)
            .SingleOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidCredentials);
        }

        // Locked accounts answer exactly like a wrong password so the lockout
        // can't be used to probe accounts or confirm a guessed password.
        if (user.LockoutEndUtc > dateTimeProvider.UtcNow)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidCredentials);
        }

        if (!passwordHasher.Verify(command.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;

            if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
            {
                user.LockoutEndUtc = dateTimeProvider.UtcNow.AddMinutes(LockoutMinutes);
                user.FailedLoginAttempts = 0;
            }

            await context.SaveChangesAsync(cancellationToken);

            return Result.Failure<AuthTokensResponse>(UserErrors.InvalidCredentials);
        }

        if (user.FailedLoginAttempts > 0 || user.LockoutEndUtc is not null)
        {
            user.FailedLoginAttempts = 0;
            user.LockoutEndUtc = null;
        }

        if (!user.IsEmailVerified)
        {
            return Result.Failure<AuthTokensResponse>(UserErrors.EmailNotVerified);
        }

        user.RefreshTokens.RemoveAll(t => t.IsExpired);

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

        string accessToken = tokenProvider.CreateAccessToken(user);

        return new AuthTokensResponse(
            accessToken,
            rawRefreshToken,
            dateTimeProvider.UtcNow.AddMinutes(AccessTokenLifetimeMinutes));
    }
}
