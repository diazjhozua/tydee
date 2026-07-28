namespace Contracts.Accounts;

public sealed record CreateAccountRequest(string Name, string Type, decimal AllocationPercent);
