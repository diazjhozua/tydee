using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.List;
using Contracts.Accounts;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class ListAccounts : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/accounts", async (
            bool? includeArchived,
            IUserContext userContext,
            IQueryHandler<ListAccountsQuery, List<AccountListItem>> handler,
            CancellationToken cancellationToken) =>
        {
            Result<List<AccountListItem>> result = await handler.Handle(
                new ListAccountsQuery(userContext.UserId, includeArchived ?? false),
                cancellationToken);

            return result.Match(
                items => Results.Ok(items
                    .Select(a => new AccountResponse(
                        a.Id,
                        a.Name,
                        a.Type.ToString(),
                        a.AllocationPercent,
                        a.Balance,
                        a.IsArchived))
                    .ToList()),
                CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("List accounts with their computed balances.")
        .RequireAuthorization();
    }
}
