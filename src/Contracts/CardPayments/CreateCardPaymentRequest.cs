namespace Contracts.CardPayments;

public sealed record CreateCardPaymentRequest(
    Guid FromAccountId,
    Guid CardAccountId,
    decimal Amount,
    DateOnly Date);
