using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Users.Me;
using Contracts.Users;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class UpdateDefaultPage : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/me/default-page", async (
            UpdateDefaultPageRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateDefaultPageCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new UpdateDefaultPageCommand(userContext.UserId, request.DefaultPage),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Set the page Tydee opens to.")
        .RequireAuthorization();
    }
}
