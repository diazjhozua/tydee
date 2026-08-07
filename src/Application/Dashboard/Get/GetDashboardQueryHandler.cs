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

        var categoryTotals = await context.Expenses
            .Where(e => e.UserId == query.UserId && e.Date >= monthStart && e.Date < monthEnd)
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Amount = g.Sum(e => e.Amount) })
            .OrderByDescending(c => c.Amount)
            .ToListAsync(cancellationToken);

        var spentByCategory = categoryTotals
            .Select(c => new CategorySpend(c.Category, c.Amount))
            .ToList();

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

        var recentAdjustments = await context.Adjustments
            .Where(a => a.UserId == query.UserId && a.Date >= monthStart && a.Date < monthEnd)
            .OrderByDescending(a => a.Date).ThenByDescending(a => a.CreatedAtUtc)
            .Take(RecentActivityCount)
            .Join(
                context.Accounts,
                a => a.AccountId,
                acc => acc.Id,
                (a, acc) => new { a.Id, a.Amount, a.Date, a.CreatedAtUtc, AccountName = acc.Name })
            .ToListAsync(cancellationToken);

        var recentTransfers = await context.Transfers
            .Where(t => t.UserId == query.UserId && t.Date >= monthStart && t.Date < monthEnd)
            .OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAtUtc)
            .Take(RecentActivityCount)
            .Join(
                context.Accounts,
                t => t.FromAccountId,
                acc => acc.Id,
                (t, acc) => new { t.Id, t.Amount, t.Date, t.CreatedAtUtc, t.ToAccountId, FromName = acc.Name })
            .Join(
                context.Accounts,
                t => t.ToAccountId,
                acc => acc.Id,
                (t, acc) => new { t.Id, t.Amount, t.Date, t.CreatedAtUtc, t.FromName, ToName = acc.Name })
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
            .Concat(recentAdjustments.Select(a => new
            {
                Item = new Activity(a.Id, "adjustment", a.Amount, a.AccountName, null, a.Date, []),
                a.Date,
                a.CreatedAtUtc,
            }))
            .Concat(recentTransfers.Select(t => new
            {
                Item = new Activity(
                    t.Id, "transfer", t.Amount, $"{t.FromName} → {t.ToName}", null, t.Date, []),
                t.Date,
                t.CreatedAtUtc,
            }))
            .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAtUtc)
            .Take(RecentActivityCount)
            .Select(x => x.Item)
            .ToList();

        return new DashboardResult(accountBalances, totalSpentThisMonth, spentByCategory, recentActivity);
    }
}
