using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Suggestions;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Admin.GetStats;

internal sealed class GetStatsQueryHandler(IApplicationDbContext context)
    : IQueryHandler<GetStatsQuery, StatsResult>
{
    public async Task<Result<StatsResult>> Handle(
        GetStatsQuery query,
        CancellationToken cancellationToken)
    {
        return new StatsResult(
            await context.Users.CountAsync(cancellationToken),
            await context.Users.CountAsync(u => u.IsEmailVerified, cancellationToken),
            await context.Accounts.CountAsync(cancellationToken),
            await context.Expenses.CountAsync(cancellationToken),
            await context.Suggestions.CountAsync(s => s.Status == SuggestionStatuses.Open, cancellationToken));
    }
}