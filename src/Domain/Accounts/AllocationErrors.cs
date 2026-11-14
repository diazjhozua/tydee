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

    public static readonly Error CreditCardNotAllocatable = Error.Problem(
        "Allocation.CreditCardNotAllocatable",
        "Credit card accounts cannot receive an allocation percent.");

    public static readonly Error CreditCardHasAllocations = Error.Problem(
        "Allocation.CreditCardHasAllocations",
        "This account has income allocations. Reassign or remove those allocations before switching it to a credit card.");
}
