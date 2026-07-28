using Domain.Accounts;
using SharedKernel;

namespace Web.Api.Endpoints.Accounts;

internal static class AccountTypeParser
{
    public static Result<AccountType> Parse(string type) =>
        Enum.TryParse(type, ignoreCase: true, out AccountType parsed) && Enum.IsDefined(parsed)
            ? parsed
            : Result.Failure<AccountType>(Error.Problem(
                "Accounts.InvalidType",
                "Account type must be either 'Spending' or 'Saving'."));
}
