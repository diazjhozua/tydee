using Application.Abstractions.Messaging;

namespace Application.Accounts.Update;

public sealed record UpdateAccountCommand(
    Guid UserId,
    Guid AccountId,
    string Name,
    string Type,
    string? Icon,
    string? Color) : ICommand;
