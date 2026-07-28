namespace Contracts.Incomes;

public sealed record CreateIncomeRequest(
    decimal Amount,
    string Source,
    DateOnly Date,
    List<AllocationLineItem> Allocations);
