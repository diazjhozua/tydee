using Application.Abstractions.Messaging;

namespace Application.Transfers.Delete;

public sealed record DeleteTransferCommand(Guid UserId, Guid TransferId) : ICommand;
