namespace Domain.Adjustments;

public sealed class Adjustment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }

    // Signed delta against the computed balance at the time it was made.
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
