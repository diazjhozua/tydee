using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.Reorder;
using Contracts.Accounts;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class ReorderAccounts : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/accounts/reorder", async (
            ReorderAccountsRequest request,
            IUserContext userContext,
            ICommandHandler<ReorderAccountsCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new ReorderAccountsCommand(userContext.UserId, request.AccountIds);

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Reorder active accounts. Must include every active account exactly once.")
        .RequireAuthorization();
    }
}
