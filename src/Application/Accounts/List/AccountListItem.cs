using Domain.Accounts;

namespace Application.Accounts.List;

public sealed record AccountListItem(
    Guid Id,
    string Name,
    AccountType Type,
    decimal AllocationPercent,
    decimal Balance,
    bool IsArchived);
