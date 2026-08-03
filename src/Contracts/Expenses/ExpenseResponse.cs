namespace Contracts.Expenses;

public sealed record ExpenseResponse(
    Guid Id,
    Guid AccountId,
    string AccountName,
    decimal Amount,
    string? Note,
    string? Category,
    DateOnly Date);
