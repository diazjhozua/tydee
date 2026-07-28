using SharedKernel;

namespace Domain.Accounts;

public static class AllocationErrors
{
    public static readonly Error MustTotal100 = Error.Problem(
        "Allocation.MustTotal100",
        "Account allocation percents must total exactly 100.");

    public static readonly Error AllAccountsRequired = Error.Problem(
        "Allocation.AllAccountsRequired",
        "The template must include every active account exactly once.");
}
