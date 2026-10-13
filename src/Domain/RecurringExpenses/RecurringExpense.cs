namespace Domain.RecurringExpenses;

public sealed class RecurringExpense
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid AccountId { get; set; }
    public decimal Amount { get; set; }
    public string? Category { get; set; }
    public string? Note { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}