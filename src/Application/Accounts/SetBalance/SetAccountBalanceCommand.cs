using Application.Abstractions.Messaging;

namespace Application.Accounts.SetBalance;

public sealed record SetAccountBalanceCommand(
    Guid UserId,
    Guid AccountId,
    decimal NewBalance,
    DateOnly Date) : ICommand<Guid>;
