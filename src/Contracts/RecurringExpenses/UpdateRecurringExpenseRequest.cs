namespace Contracts.RecurringExpenses;

public sealed record UpdateRecurringExpenseRequest(
    string Name,
    Guid AccountId,
    decimal Amount,
    string? Category,
    string? Note);