namespace Domain.CardPayments;

public sealed class CardPayment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid FromAccountId { get; set; }
    public Guid CardAccountId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
