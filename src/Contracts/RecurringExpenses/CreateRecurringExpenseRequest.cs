namespace Contracts.RecurringExpenses;

public sealed record CreateRecurringExpenseRequest(
    string Name,
    Guid AccountId,
    decimal Amount,
    string? Category,
    string? Note);