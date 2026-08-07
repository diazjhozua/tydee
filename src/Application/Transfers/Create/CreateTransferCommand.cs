using Application.Abstractions.Messaging;

namespace Application.Transfers.Create;

public sealed record CreateTransferCommand(
    Guid UserId,
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount,
    DateOnly Date) : ICommand<Guid>;
