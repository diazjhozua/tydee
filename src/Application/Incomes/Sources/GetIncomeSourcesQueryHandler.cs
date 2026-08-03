using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Incomes.Sources;

internal sealed class GetIncomeSourcesQueryHandler(IApplicationDbContext context)
    : IQueryHandler<GetIncomeSourcesQuery, List<string>>
{
    public async Task<Result<List<string>>> Handle(
        GetIncomeSourcesQuery query,
        CancellationToken cancellationToken)
    {
        return await context.Incomes
            .Where(i => i.UserId == query.UserId)
            .GroupBy(i => i.Source)
            .Select(g => new { Source = g.Key, LastUsed = g.Max(i => i.CreatedAtUtc) })
            .OrderByDescending(x => x.LastUsed)
            .Take(10)
            .Select(x => x.Source)
            .ToListAsync(cancellationToken);
    }
}
