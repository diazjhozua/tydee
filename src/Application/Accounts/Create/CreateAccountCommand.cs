using Application.Abstractions.Messaging;
using Domain.Accounts;

namespace Application.Accounts.Create;

public sealed record CreateAccountCommand(
    Guid UserId,
    string Name,
    AccountType Type,
    decimal AllocationPercent,
    string? Icon,
    string? Color) : ICommand<Guid>;
