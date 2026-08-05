namespace Contracts.Accounts;

public sealed record SetAccountBalanceRequest(decimal NewBalance, DateOnly Date);
