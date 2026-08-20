using Application.Abstractions.Messaging;
using Domain.Accounts;

namespace Application.Accounts.Update;

public sealed record UpdateAccountCommand(
    Guid UserId,
    Guid AccountId,
    string Name,
    AccountType Type,
    string? Icon,
    string? Color) : ICommand;
