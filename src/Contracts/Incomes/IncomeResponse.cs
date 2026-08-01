namespace Contracts.Incomes;

public sealed record IncomeResponse(
    Guid Id,
    decimal Amount,
    string Source,
    DateOnly Date,
    List<AllocationLineItem> Allocations);
