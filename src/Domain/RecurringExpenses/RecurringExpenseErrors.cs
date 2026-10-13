using SharedKernel;

namespace Domain.RecurringExpenses;

public static class RecurringExpenseErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "RecurringExpenses.NotFound",
        "The saved expense was not found.");

    public static readonly Error Archived = Error.Conflict(
        "RecurringExpenses.Archived",
        "The saved expense is archived.");
}