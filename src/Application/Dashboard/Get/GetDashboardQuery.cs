using Application.Abstractions.Messaging;
using Domain.Accounts;

namespace Application.Dashboard.Get;

public sealed record GetDashboardQuery(Guid UserId, int? Year, int? Month) : IQuery<DashboardResult>;

public sealed record DashboardResult(
    List<AccountBalance> AccountBalances,
    decimal TotalSpentThisMonth,
    List<Activity> RecentActivity);

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
    DateOnly Date);
