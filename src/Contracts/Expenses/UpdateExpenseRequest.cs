namespace Contracts.Expenses;

public sealed record UpdateExpenseRequest(Guid AccountId, decimal Amount, string? Note, string? Category, DateOnly Date);
