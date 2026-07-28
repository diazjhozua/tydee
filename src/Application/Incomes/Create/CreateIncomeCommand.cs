using Application.Abstractions.Messaging;

namespace Application.Incomes.Create;

public sealed record CreateIncomeCommand(
    Guid UserId,
    decimal Amount,
    string Source,
    DateOnly Date,
    List<IncomeAllocationItem> Allocations) : ICommand<Guid>;
