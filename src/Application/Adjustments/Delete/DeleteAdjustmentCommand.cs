using Application.Abstractions.Messaging;

namespace Application.Adjustments.Delete;

public sealed record DeleteAdjustmentCommand(Guid UserId, Guid AdjustmentId) : ICommand;
