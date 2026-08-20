namespace Contracts.Accounts;

public sealed record ReorderAccountsRequest(List<Guid> AccountIds);
