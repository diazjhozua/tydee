using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Expenses.List;
using Contracts.Expenses;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Expenses;

internal sealed class ListExpenses : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/expenses", async (
            Guid? accountId,
            int? page,
            int? pageSize,
            IUserContext userContext,
            IQueryHandler<ListExpensesQuery, List<ExpenseListItem>> handler,
            CancellationToken cancellationToken) =>
        {
            Result<List<ExpenseListItem>> result = await handler.Handle(
                new ListExpensesQuery(userContext.UserId, accountId, page ?? 1, pageSize ?? 20),
                cancellationToken);

            return result.Match(
                items => Results.Ok(items
                    .Select(e => new ExpenseResponse(
                        e.Id, e.AccountId, e.AccountName, e.Amount, e.Note, e.Date))
                    .ToList()),
                CustomResults.Problem);
        })
        .WithTags(Tags.Expenses)
        .WithSummary("List expenses, newest first. Filter by account with ?accountId=.")
        .RequireAuthorization();
    }
}
