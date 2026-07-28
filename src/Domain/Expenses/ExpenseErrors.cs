using SharedKernel;

namespace Domain.Expenses;

public static class ExpenseErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Expenses.NotFound",
        "The expense was not found.");
}
