namespace Contracts.Incomes;

public sealed record UpdateIncomeRequest(
    decimal Amount,
    string Source,
    DateOnly Date,
    List<AllocationLineItem> Allocations);
