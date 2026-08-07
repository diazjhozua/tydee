using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Transfers.Delete;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Transfers;

internal sealed class DeleteTransfer : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/transfers/{transferId:guid}", async (
            Guid transferId,
            IUserContext userContext,
            ICommandHandler<DeleteTransferCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new DeleteTransferCommand(userContext.UserId, transferId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Delete a transfer; both balances revert.")
        .RequireAuthorization();
    }
}
