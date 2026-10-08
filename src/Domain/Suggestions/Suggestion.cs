namespace Domain.Suggestions;

public sealed class Suggestion
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }
    public int? Rating { get; set; }
    public string Status { get; set; } = SuggestionStatuses.Open;
    public string? AdminNote { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public static class SuggestionStatuses
{
    public const string Open = "Open";
    public const string Done = "Done";
    public const string Dismissed = "Dismissed";

    public static readonly string[] All = [Open, Done, Dismissed];

    public static bool IsValid(string status) => All.Contains(status);
}