namespace Contracts.Accounts;

public sealed record UpdateAllocationTemplateRequest(List<AccountAllocationItem> Items);

public sealed record AccountAllocationItem(Guid AccountId, decimal Percent);
