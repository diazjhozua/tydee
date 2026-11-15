using Application.Abstractions.Messaging;

namespace Application.CardPayments.Create;

public sealed record CreateCardPaymentCommand(
    Guid UserId,
    Guid FromAccountId,
    Guid CardAccountId,
    decimal Amount,
    DateOnly Date) : ICommand<Guid>;
