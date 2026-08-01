using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Expenses.List;

internal sealed class ListExpensesQueryHandler(IApplicationDbContext context)
    : IQueryHandler<ListExpensesQuery, List<ExpenseListItem>>
{
    public async Task<Result<List<ExpenseListItem>>> Handle(ListExpensesQuery query, CancellationToken cancellationToken)
    {
        int page = Math.Max(query.Page, 1);
        int pageSize = Math.Clamp(query.PageSize, 1, 100);

        DateOnly? monthStart = query is { Year: not null, Month: not null }
            ? new DateOnly(query.Year.Value, query.Month.Value, 1)
            : null;
        DateOnly? monthEnd = monthStart?.AddMonths(1);

        return await context.Expenses
            .Where(e => e.UserId == query.UserId &&
                        (query.AccountId == null || e.AccountId == query.AccountId) &&
                        (monthStart == null || e.Date >= monthStart && e.Date < monthEnd))
            .OrderByDescending(e => e.Date)
            .ThenByDescending(e => e.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(
                context.Accounts,
                e => e.AccountId,
                a => a.Id,
                (e, a) => new ExpenseListItem(e.Id, e.AccountId, a.Name, e.Amount, e.Note, e.Date))
            .ToListAsync(cancellationToken);
    }
}
