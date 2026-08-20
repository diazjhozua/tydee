using SharedKernel;

namespace Domain.Accounts;

public static class AccountErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Accounts.NotFound",
        "The account was not found.");

    public static readonly Error Archived = Error.Problem(
        "Accounts.Archived",
        "This account is archived and can no longer be used.");

    public static readonly Error NameTaken = Error.Conflict(
        "Accounts.NameTaken",
        "You already have an account with this name.");

    public static readonly Error AllAccountsRequired = Error.Problem(
        "Accounts.AllAccountsRequired",
        "Reordering must include every active account exactly once.");
}
