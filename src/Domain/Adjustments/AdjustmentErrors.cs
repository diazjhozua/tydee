using SharedKernel;

namespace Domain.Adjustments;

public static class AdjustmentErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Adjustments.NotFound",
        "The adjustment was not found.");

    public static readonly Error BalanceUnchanged = Error.Problem(
        "Adjustments.BalanceUnchanged",
        "The account already has this balance.");
}
