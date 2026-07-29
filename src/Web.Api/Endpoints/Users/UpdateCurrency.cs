using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Users.Me;
using Contracts.Users;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class UpdateCurrency : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/me/currency", async (
            UpdateCurrencyRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateCurrencyCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new UpdateCurrencyCommand(userContext.UserId, request.Currency),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Set the user's preferred display currency.")
        .RequireAuthorization();
    }
}
