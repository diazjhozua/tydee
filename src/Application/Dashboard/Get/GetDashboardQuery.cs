using Application.Abstractions.Messaging;
using Domain.Accounts;

namespace Application.Dashboard.Get;

public sealed record GetDashboardQuery(Guid UserId, int? Year, int? Month) : IQuery<DashboardResult>;

public sealed record DashboardResult(
    List<AccountBalance> AccountBalances,
    decimal TotalSpentThisMonth,
    List<CategorySpend> SpentByCategory,
    List<Activity> RecentActivity);

public sealed record CategorySpend(string? Category, decimal Amount);

public sealed record AccountBalance(
    Guid AccountId,
    string Name,
    AccountType Type,
    decimal AllocationPercent,
    decimal Balance);

public sealed record Activity(
    Guid Id,
    string Kind,
    decimal Amount,
    string Description,
    string? Category,
    DateOnly Date,
    List<ActivityAllocation> Allocations);

public sealed record ActivityAllocation(string AccountName, decimal Amount);
