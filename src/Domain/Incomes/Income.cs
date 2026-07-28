namespace Domain.Incomes;

public sealed class Income
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public List<IncomeAllocation> Allocations { get; } = [];
}
