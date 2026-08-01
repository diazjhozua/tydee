using Application.Abstractions.Messaging;

namespace Application.Incomes.Get;

public sealed record GetIncomeQuery(Guid UserId, Guid IncomeId) : IQuery<IncomeResult>;

public sealed record IncomeResult(
    Guid Id,
    decimal Amount,
    string Source,
    DateOnly Date,
    List<IncomeAllocationResult> Allocations);

public sealed record IncomeAllocationResult(Guid AccountId, decimal Amount);
