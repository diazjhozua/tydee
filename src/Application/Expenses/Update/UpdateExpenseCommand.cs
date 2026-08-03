using Application.Abstractions.Messaging;

namespace Application.Expenses.Update;

public sealed record UpdateExpenseCommand(
    Guid UserId,
    Guid ExpenseId,
    Guid AccountId,
    decimal Amount,
    string? Note,
    string? Category,
    DateOnly Date) : ICommand;
