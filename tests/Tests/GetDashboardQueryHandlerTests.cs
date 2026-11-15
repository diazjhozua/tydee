using Application.Dashboard.Get;
using Domain.Accounts;
using Domain.CardPayments;
using Domain.Expenses;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class GetDashboardQueryHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    [Fact]
    public async Task Card_payment_appears_as_recent_activity_and_leaves_spend_unchanged()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = budget.Id,
            Amount = 50,
            Date = Date,
            CreatedAtUtc = DateTime.UtcNow,
        });
        db.CardPayments.Add(new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 200,
            Date = Date,
            CreatedAtUtc = DateTime.UtcNow,
        });
        db.SaveChanges();

        var result = await new GetDashboardQueryHandler(db, new FixedDateTimeProvider()).Handle(
            new GetDashboardQuery(user.Id, 2026, 8),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value.TotalSpentThisMonth.ShouldBe(50m);
        result.Value.RecentActivity.ShouldContain(a =>
            a.Kind == "cardPayment" &&
            a.Description == "Budget → Visa" &&
            a.Amount == 200m);
        result.Value.AccountBalances.ShouldContain(a =>
            a.AccountId == card.Id && a.Type == "CreditCard" && a.Balance == 200m);
    }

    [Fact]
    public async Task Card_balance_is_negative_after_a_card_expense()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = card.Id,
            Amount = 100,
            Date = Date,
            CreatedAtUtc = DateTime.UtcNow,
        });
        db.SaveChanges();

        var result = await new GetDashboardQueryHandler(db, new FixedDateTimeProvider()).Handle(
            new GetDashboardQuery(user.Id, 2026, 8),
            CancellationToken.None);

        result.Value.AccountBalances.ShouldContain(a => a.AccountId == card.Id && a.Balance == -100m);
        result.Value.TotalSpentThisMonth.ShouldBe(100m);
    }
}
