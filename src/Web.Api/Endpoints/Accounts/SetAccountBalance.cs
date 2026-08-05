using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.SetBalance;
using Contracts.Accounts;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class SetAccountBalance : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/accounts/{accountId:guid}/balance", async (
            Guid accountId,
            SetAccountBalanceRequest request,
            IUserContext userContext,
            ICommandHandler<SetAccountBalanceCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            Result<Guid> result = await handler.Handle(
                new SetAccountBalanceCommand(userContext.UserId, accountId, request.NewBalance, request.Date),
                cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Set the account's balance; the difference is stored as an adjustment.")
        .RequireAuthorization();
    }
}
