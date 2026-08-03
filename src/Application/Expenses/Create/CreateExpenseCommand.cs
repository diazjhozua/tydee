using Application.Abstractions.Messaging;

namespace Application.Expenses.Create;

public sealed record CreateExpenseCommand(
    Guid UserId,
    Guid AccountId,
    decimal Amount,
    string? Note,
    string? Category,
    DateOnly Date) : ICommand<Guid>;
