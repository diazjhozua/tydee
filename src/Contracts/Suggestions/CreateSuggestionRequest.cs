namespace Contracts.Suggestions;

public sealed record CreateSuggestionRequest(string Message, string? Category, int? Rating);