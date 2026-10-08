using Application.Abstractions.Messaging;

namespace Application.Admin.GetStats;

public sealed record GetStatsQuery : IQuery<StatsResult>;

public sealed record StatsResult(
    int Users,
    int VerifiedUsers,
    int Accounts,
    int Expenses,
    int OpenSuggestions);