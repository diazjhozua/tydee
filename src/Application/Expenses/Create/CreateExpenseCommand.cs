using Application.Abstractions.Messaging;

namespace Application.Expenses.Create;

public sealed record CreateExpenseCommand(
    Guid UserId,
    Guid AccountId,
    decimal Amount,
    string? Note,
    DateOnly Date) : ICommand<Guid>;
