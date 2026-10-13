using Application.Abstractions.Messaging;

namespace Application.RecurringExpenses.Update;

public sealed record UpdateRecurringExpenseCommand(
    Guid UserId,
    Guid RecurringExpenseId,
    string Name,
    Guid AccountId,
    decimal Amount,
    string? Category,
    string? Note) : ICommand;