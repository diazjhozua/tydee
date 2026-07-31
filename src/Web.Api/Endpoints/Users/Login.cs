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
            CancellationToken cancellationToken) =>
        {
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
