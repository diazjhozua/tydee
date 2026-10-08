using Application.Abstractions.Messaging;

namespace Application.Suggestions.Create;

public sealed record CreateSuggestionCommand(
    Guid UserId,
    string Message,
    string? Category,
    int? Rating) : ICommand<Guid>;