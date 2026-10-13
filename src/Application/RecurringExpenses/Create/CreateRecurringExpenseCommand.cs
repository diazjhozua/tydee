using Application.Abstractions.Messaging;

namespace Application.RecurringExpenses.Create;

public sealed record CreateRecurringExpenseCommand(
    Guid UserId,
    string Name,
    Guid AccountId,
    decimal Amount,
    string? Category,
    string? Note) : ICommand<Guid>;