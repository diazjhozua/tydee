namespace Contracts.Expenses;

public sealed record CreateExpenseRequest(Guid AccountId, decimal Amount, string? Note, DateOnly Date);
