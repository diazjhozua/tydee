using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.RecurringExpenses.List;
using Contracts.RecurringExpenses;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.RecurringExpenses;

internal sealed class ListRecurringExpenses : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/recurring-expenses", async (
            bool? includeArchived,
            IUserContext userContext,
            IQueryHandler<ListRecurringExpensesQuery, List<RecurringExpenseListItem>> handler,
            CancellationToken cancellationToken) =>
        {
            Result<List<RecurringExpenseListItem>> result = await handler.Handle(
                new ListRecurringExpensesQuery(userContext.UserId, includeArchived ?? false),
                cancellationToken);

            return result.Match(
                items => Results.Ok(items
                    .Select(r => new RecurringExpenseResponse(
                        r.Id, r.Name, r.AccountId, r.AccountName, r.Amount, r.Category, r.Note, r.IsArchived))
                    .ToList()),
                CustomResults.Problem);
        })
        .WithTags(Tags.RecurringExpenses)
        .WithSummary("List recurring expenses. Add ?includeArchived=true to see archived ones.")
        .RequireAuthorization();
    }
}