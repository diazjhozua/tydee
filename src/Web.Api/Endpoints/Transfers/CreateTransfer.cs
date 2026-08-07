using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Transfers.Create;
using Contracts.Transfers;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Transfers;

internal sealed class CreateTransfer : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/transfers", async (
            CreateTransferRequest request,
            IUserContext userContext,
            ICommandHandler<CreateTransferCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            Result<Guid> result = await handler.Handle(
                new CreateTransferCommand(
                    userContext.UserId,
                    request.FromAccountId,
                    request.ToAccountId,
                    request.Amount,
                    request.Date),
                cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Move money between two of the user's accounts.")
        .RequireAuthorization();
    }
}
