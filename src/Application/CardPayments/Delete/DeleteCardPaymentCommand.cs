using Application.Abstractions.Messaging;

namespace Application.CardPayments.Delete;

public sealed record DeleteCardPaymentCommand(Guid UserId, Guid PaymentId) : ICommand;
