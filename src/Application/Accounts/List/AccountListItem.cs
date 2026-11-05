namespace Application.Accounts.List;

public sealed record AccountListItem(
    Guid Id,
    string Name,
    string Type,
    decimal AllocationPercent,
    decimal Balance,
    bool IsArchived,
    int DisplayOrder,
    string? Icon,
    string? Color);
