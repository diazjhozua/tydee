namespace Contracts.Accounts;

public sealed record AccountResponse(
    Guid Id,
    string Name,
    string Type,
    decimal AllocationPercent,
    decimal Balance,
    bool IsArchived);
