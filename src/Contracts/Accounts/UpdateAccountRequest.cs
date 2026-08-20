namespace Contracts.Accounts;

public sealed record UpdateAccountRequest(string Name, string Type, string? Icon, string? Color);
