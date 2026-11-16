using System.Threading.RateLimiting;
using Application.Abstractions.Messaging;
using Application.Users.Login;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class Login : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/login", async (
            LoginRequest request,
            ICommandHandler<LoginCommand, AuthTokensResponse> handler,
            LoginAttemptLimiter attemptLimiter,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            // Every attempt takes a permit, right or wrong, so the budget is per account.
            // A flood blocks this account's logins only while it keeps exhausting the window;
            // the block clears once the attempts stop. Nothing is locked.
            using RateLimitLease lease = attemptLimiter.Acquire(request.Email);

            if (!lease.IsAcquired)
            {
                RateLimitingExtensions.SetRetryAfter(httpContext.Response, lease);

                return Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Users.TooManyAttempts",
                    detail: "Too many login attempts for this account. Try again shortly.");
            }

            Result<AuthTokensResponse> result = await handler.Handle(
                new LoginCommand(request.Email, request.Password),
                cancellationToken);

            return result.Match(
                tokens => Results.Ok(new AuthResponse(
                    tokens.AccessToken,
                    tokens.RefreshToken,
                    tokens.AccessTokenExpiresAt)),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
        .WithSummary("Login with email and password. Returns access and refresh tokens.");
    }
}
