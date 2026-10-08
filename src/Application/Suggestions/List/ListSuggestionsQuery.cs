using Application.Abstractions.Messaging;

namespace Application.Suggestions.List;

public sealed record ListSuggestionsQuery(
    string? Status,
    int Page,
    int PageSize) : IQuery<List<SuggestionListItem>>;

public sealed record SuggestionListItem(
    Guid Id,
    Guid UserId,
    string UserEmail,
    string Message,
    string? Category,
    int? Rating,
    string Status,
    string? AdminNote,
    DateTime CreatedAtUtc);