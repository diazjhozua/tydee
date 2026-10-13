namespace Contracts.RecurringExpenses;

public sealed record RecurringExpenseResponse(
    Guid Id,
    string Name,
    Guid AccountId,
    string AccountName,
    decimal Amount,
    string? Category,
    string? Note,
    bool IsArchived);