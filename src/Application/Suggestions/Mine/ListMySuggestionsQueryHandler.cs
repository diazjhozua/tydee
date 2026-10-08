using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Suggestions.Mine;

internal sealed class ListMySuggestionsQueryHandler(IApplicationDbContext context)
    : IQueryHandler<ListMySuggestionsQuery, List<MySuggestionItem>>
{
    public async Task<Result<List<MySuggestionItem>>> Handle(
        ListMySuggestionsQuery query,
        CancellationToken cancellationToken)
    {
        return await context.Suggestions
            .Where(s => s.UserId == query.UserId)
            .OrderByDescending(s => s.CreatedAtUtc)
            .Select(s => new MySuggestionItem(
                s.Id,
                s.Message,
                s.Category,
                s.Rating,
                s.Status,
                s.AdminNote,
                s.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }
}