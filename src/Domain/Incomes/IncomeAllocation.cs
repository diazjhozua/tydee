namespace Domain.Incomes;

public sealed class IncomeAllocation
{
    public Guid Id { get; set; }
    public Guid IncomeId { get; set; }
    public Guid AccountId { get; set; }
    public decimal Amount { get; set; }
}
