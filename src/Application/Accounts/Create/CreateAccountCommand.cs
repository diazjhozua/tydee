using Application.Abstractions.Messaging;

namespace Application.Accounts.Create;

public sealed record CreateAccountCommand(
    Guid UserId,
    string Name,
    string Type,
    decimal AllocationPercent,
    string? Icon,
    string? Color) : ICommand<Guid>;
