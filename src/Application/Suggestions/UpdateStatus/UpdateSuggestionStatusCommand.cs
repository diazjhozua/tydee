using Application.Abstractions.Messaging;

namespace Application.Suggestions.UpdateStatus;

public sealed record UpdateSuggestionStatusCommand(
    Guid SuggestionId,
    string Status,
    string? AdminNote) : ICommand;