namespace Contracts.Expenses;

public sealed record UpdateExpenseRequest(Guid AccountId, decimal Amount, string? Note, DateOnly Date);
