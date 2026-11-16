using Application.Abstractions.Messaging;
using Application.Users.Logout;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class Logout : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/logout", async (
            RefreshTokenRequest request,
            ICommandHandler<LogoutCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new LogoutCommand(request.RefreshToken),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("End every session of the user who owns this refresh token.");
    }
}
