namespace Contracts.CardPayments;

public sealed record CardStatementResponse(
    Guid AccountId,
    string Name,
    decimal Owed,
    decimal PaidThisMonth,
    string PaymentState,
    List<CardStatementPaymentItem> Payments);

public sealed record CardStatementPaymentItem(
    Guid Id,
    Guid FromAccountId,
    string FromAccountName,
    decimal Amount,
    DateOnly Date);
