using Application.Abstractions.Messaging;

namespace Application.Suggestions.Mine;

public sealed record ListMySuggestionsQuery(Guid UserId) : IQuery<List<MySuggestionItem>>;

public sealed record MySuggestionItem(
    Guid Id,
    string Message,
    string? Category,
    int? Rating,
    string Status,
    string? AdminNote,
    DateTime CreatedAtUtc);