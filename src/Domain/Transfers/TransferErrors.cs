using SharedKernel;

namespace Domain.Transfers;

public static class TransferErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "Transfers.NotFound",
        "The transfer was not found.");

    public static readonly Error SameAccount = Error.Problem(
        "Transfers.SameAccount",
        "Pick two different accounts.");
}
