using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.RecurringExpenses.List;

internal sealed class ListRecurringExpensesQueryHandler(IApplicationDbContext context)
    : IQueryHandler<ListRecurringExpensesQuery, List<RecurringExpenseListItem>>
{
    public async Task<Result<List<RecurringExpenseListItem>>> Handle(
        ListRecurringExpensesQuery query,
        CancellationToken cancellationToken)
    {
        return await context.RecurringExpenses
            .Where(r => r.UserId == query.UserId && (query.IncludeArchived || !r.IsArchived))
            .OrderBy(r => r.Name)
            .Join(
                context.Accounts,
                r => r.AccountId,
                a => a.Id,
                (r, a) => new RecurringExpenseListItem(
                    r.Id, r.Name, r.AccountId, a.Name, r.Amount, r.Category, r.Note, r.IsArchived))
            .ToListAsync(cancellationToken);
    }
}