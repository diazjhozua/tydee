using Application.Abstractions.Messaging;

namespace Application.CardPayments.Statement;

public sealed record GetCardStatementQuery(Guid UserId, Guid AccountId, int? Year, int? Month)
    : IQuery<CardStatementResult>;

public sealed record CardStatementResult(
    Guid AccountId,
    string Name,
    decimal Owed,
    decimal PaidThisMonth,
    CardPaymentState PaymentState,
    List<CardStatementPayment> Payments);

public sealed record CardStatementPayment(
    Guid Id,
    Guid FromAccountId,
    string FromAccountName,
    decimal Amount,
    DateOnly Date);

public enum CardPaymentState
{
    Settled,
    InCredit,
    PartiallyPaid,
    Unpaid,
}
