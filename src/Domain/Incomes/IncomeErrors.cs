using SharedKernel;

namespace Domain.Incomes;

public static class IncomeErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Incomes.NotFound",
        "The income entry was not found.");

    public static readonly Error AllocationMismatch = Error.Problem(
        "Incomes.AllocationMismatch",
        "Allocations must add up to the income amount.");

    public static readonly Error AllocationAccountInvalid = Error.Problem(
        "Incomes.AllocationAccountInvalid",
        "One or more allocation accounts are invalid or archived.");
}
