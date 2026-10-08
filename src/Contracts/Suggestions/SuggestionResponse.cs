namespace Contracts.Suggestions;

public sealed record SuggestionResponse(
    Guid Id,
    string Message,
    string? Category,
    int? Rating,
    string Status,
    string? AdminNote,
    DateTime CreatedAtUtc);

public sealed record AdminSuggestionResponse(
    Guid Id,
    Guid UserId,
    string UserEmail,
    string Message,
    string? Category,
    int? Rating,
    string Status,
    string? AdminNote,
    DateTime CreatedAtUtc);

public sealed record UpdateSuggestionStatusRequest(string Status, string? AdminNote);