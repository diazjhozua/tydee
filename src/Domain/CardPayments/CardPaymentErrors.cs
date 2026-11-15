using SharedKernel;

namespace Domain.CardPayments;

public static class CardPaymentErrors
{
    public static readonly Error NotFound = Error.NotFound(
        "CardPayments.NotFound",
        "The card payment was not found.");

    public static readonly Error SameAccount = Error.Problem(
        "CardPayments.SameAccount",
        "Pick two different accounts.");

    public static readonly Error NotCreditCard = Error.Problem(
        "CardPayments.NotCreditCard",
        "Payments can only be logged to a credit card account.");

    public static readonly Error SourceIsCreditCard = Error.Problem(
        "CardPayments.SourceIsCreditCard",
        "Pay from a non-card account. A credit card cannot pay another card.");

    public static readonly Error InvalidYear = Error.Problem(
        "CardPayments.InvalidYear",
        "Provide a year between 2000 and 2200.");

    public static readonly Error InvalidMonth = Error.Problem(
        "CardPayments.InvalidMonth",
        "Provide a month between 1 and 12.");
}
