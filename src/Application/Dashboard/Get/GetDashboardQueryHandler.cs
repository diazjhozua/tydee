using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Accounts;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Dashboard.Get;

internal sealed class GetDashboardQueryHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : IQueryHandler<GetDashboardQuery, DashboardResult>
{
    private const int RecentActivityCount = 20;

    public async Task<Result<DashboardResult>> Handle(GetDashboardQuery query, CancellationToken cancellationToken)
    {
        List<Account> accounts = await context.Accounts
            .Where(a => a.UserId == query.UserId && !a.IsArchived)
            .OrderBy(a => a.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        Dictionary<Guid, decimal> balances = await BalanceCalculator.ForUserAsync(
            context, query.UserId, cancellationToken);

        var accountBalances = accounts
            .Select(a => new AccountBalance(
                a.Id, a.Name, a.Type, a.AllocationPercent, balances.GetValueOrDefault(a.Id)))
            .ToList();

        DateTime now = dateTimeProvider.UtcNow;
        var monthStart = new DateOnly(query.Year ?? now.Year, query.Month ?? now.Month, 1);
        DateOnly monthEnd = monthStart.AddMonths(1);

        decimal totalSpentThisMonth = await context.Expenses
            .Where(e => e.UserId == query.UserId && e.Date >= monthStart && e.Date < monthEnd)
            .SumAsync(e => e.Amount, cancellationToken);

        var recentExpenses = await context.Expenses
            .Where(e => e.UserId == query.UserId && e.Date >= monthStart && e.Date < monthEnd)
            .OrderByDescending(e => e.Date).ThenByDescending(e => e.CreatedAtUtc)
            .Take(RecentActivityCount)
            .Join(
                context.Accounts,
                e => e.AccountId,
                a => a.Id,
                (e, a) => new { e.Id, e.Amount, e.Note, e.Category, e.Date, e.CreatedAtUtc, AccountName = a.Name })
            .ToListAsync(cancellationToken);

        var recentIncomes = await context.Incomes
            .Where(i => i.UserId == query.UserId && i.Date >= monthStart && i.Date < monthEnd)
            .OrderByDescending(i => i.Date).ThenByDescending(i => i.CreatedAtUtc)
            .Take(RecentActivityCount)
            .Select(i => new { i.Id, i.Amount, i.Source, i.Date, i.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        var incomeIds = recentIncomes.Select(i => i.Id).ToList();

        var allocationRows = await context.IncomeAllocations
            .Where(a => incomeIds.Contains(a.IncomeId))
            .Join(
                context.Accounts,
                a => a.AccountId,
                acc => acc.Id,
                (a, acc) => new { a.IncomeId, acc.Name, a.Amount })
            .ToListAsync(cancellationToken);

        var allocationsByIncome = allocationRows
            .GroupBy(x => x.IncomeId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => new ActivityAllocation(x.Name, x.Amount)).ToList());

        var recentActivity = recentExpenses
            .Select(e => new
            {
                Item = new Activity(e.Id, "expense", e.Amount, e.Note ?? e.AccountName, e.Category, e.Date, []),
                e.Date,
                e.CreatedAtUtc,
            })
            .Concat(recentIncomes.Select(i => new
            {
                Item = new Activity(
                    i.Id,
                    "income",
                    i.Amount,
                    i.Source,
                    null,
                    i.Date,
                    allocationsByIncome.GetValueOrDefault(i.Id) ?? []),
                i.Date,
                i.CreatedAtUtc,
            }))
            .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAtUtc)
            .Take(RecentActivityCount)
            .Select(x => x.Item)
            .ToList();

        return new DashboardResult(accountBalances, totalSpentThisMonth, recentActivity);
    }
}
