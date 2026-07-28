using Application.Abstractions.Messaging;

namespace Application.Incomes.Update;

public sealed record UpdateIncomeCommand(
    Guid UserId,
    Guid IncomeId,
    decimal Amount,
    string Source,
    DateOnly Date,
    List<IncomeAllocationItem> Allocations) : ICommand;
