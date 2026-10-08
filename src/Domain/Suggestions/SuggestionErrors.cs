using SharedKernel;

namespace Domain.Suggestions;

public static class SuggestionErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Suggestions.NotFound",
        "The suggestion was not found.");
}