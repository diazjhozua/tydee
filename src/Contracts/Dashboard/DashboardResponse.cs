namespace Contracts.Dashboard;

public sealed record DashboardResponse(
    List<AccountBalanceItem> AccountBalances,
    decimal TotalSpentThisMonth,
    List<ActivityItem> RecentActivity);

public sealed record AccountBalanceItem(
    Guid AccountId,
    string Name,
    string Type,
    decimal AllocationPercent,
    decimal Balance);

public sealed record ActivityItem(
    Guid Id,
    string Kind,
    decimal Amount,
    string Description,
    string? Category,
    DateOnly Date,
    List<ActivityAllocationItem> Allocations);

public sealed record ActivityAllocationItem(string AccountName, decimal Amount);
