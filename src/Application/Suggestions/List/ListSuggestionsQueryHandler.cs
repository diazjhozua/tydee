using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Suggestions.List;

internal sealed class ListSuggestionsQueryHandler(IApplicationDbContext context)
    : IQueryHandler<ListSuggestionsQuery, List<SuggestionListItem>>
{
    public async Task<Result<List<SuggestionListItem>>> Handle(
        ListSuggestionsQuery query,
        CancellationToken cancellationToken)
    {
        int page = Math.Max(query.Page, 1);
        int pageSize = Math.Clamp(query.PageSize, 1, 100);

        return await context.Suggestions
            .Where(s => query.Status == null || s.Status == query.Status)
            .OrderByDescending(s => s.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(
                context.Users,
                s => s.UserId,
                u => u.Id,
                (s, u) => new SuggestionListItem(
                    s.Id,
                    s.UserId,
                    u.Email,
                    s.Message,
                    s.Category,
                    s.Rating,
                    s.Status,
                    s.AdminNote,
                    s.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }
}