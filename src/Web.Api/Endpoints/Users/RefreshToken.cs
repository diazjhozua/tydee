using Application.Abstractions.Messaging;
using Application.Users.Login;
using Application.Users.RefreshToken;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class RefreshToken : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/refresh-token", async (
            RefreshTokenRequest request,
            ICommandHandler<RefreshTokenCommand, AuthTokensResponse> handler,
            CancellationToken cancellationToken) =>
        {
            Result<AuthTokensResponse> result = await handler.Handle(
                new RefreshTokenCommand(request.RefreshToken),
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
        .WithSummary("Exchange a refresh token for a new token pair. The old token is revoked.");
    }
}
