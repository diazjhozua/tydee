using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Expenses.Categories;

internal sealed class GetExpenseCategoriesQueryHandler(IApplicationDbContext context)
    : IQueryHandler<GetExpenseCategoriesQuery, List<string>>
{
    public async Task<Result<List<string>>> Handle(
        GetExpenseCategoriesQuery query,
        CancellationToken cancellationToken)
    {
        return await context.Expenses
            .Where(e => e.UserId == query.UserId && e.Category != null)
            .GroupBy(e => e.Category!)
            .Select(g => new { Category = g.Key, LastUsed = g.Max(e => e.CreatedAtUtc) })
            .OrderByDescending(x => x.LastUsed)
            .Take(20)
            .Select(x => x.Category)
            .ToListAsync(cancellationToken);
    }
}
