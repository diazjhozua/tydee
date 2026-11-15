using Application.CardPayments.Statement;
using Domain.Accounts;
using Domain.CardPayments;
using Domain.Expenses;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class GetCardStatementQueryHandlerTests
{
    private static readonly DateOnly Aug1 = new(2026, 8, 1);
    private static readonly DateOnly Aug5 = new(2026, 8, 5);
    private static readonly DateOnly Aug20 = new(2026, 8, 20);
    private static readonly DateOnly Jul20 = new(2026, 7, 20);

    private static GetCardStatementQueryHandler Handler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    private static void AddCardExpense(Infrastructure.Database.ApplicationDbContext db, Guid userId, Guid cardId, decimal amount)
    {
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountId = cardId,
            Amount = amount,
            Date = Aug1,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }

    private static void AddPayment(
        Infrastructure.Database.ApplicationDbContext db,
        Guid userId,
        Guid fromId,
        Guid cardId,
        decimal amount,
        DateOnly date)
    {
        db.CardPayments.Add(new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FromAccountId = fromId,
            CardAccountId = cardId,
            Amount = amount,
            Date = date,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }

    [Fact]
    public async Task Owed_is_the_card_balance_negated_after_spending_and_paying()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddCardExpense(db, user.Id, card.Id, 100);
        AddPayment(db, user.Id, budget.Id, card.Id, 60, Aug5);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value.Owed.ShouldBe(40m);
        result.Value.PaidThisMonth.ShouldBe(60m);
        result.Value.PaymentState.ShouldBe(CardPaymentState.PartiallyPaid);
        result.Value.Name.ShouldBe("Visa");
    }

    [Fact]
    public async Task Overpaying_puts_the_card_in_credit()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddCardExpense(db, user.Id, card.Id, 100);
        AddPayment(db, user.Id, budget.Id, card.Id, 150, Aug5);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Value.Owed.ShouldBe(-50m);
        result.Value.PaymentState.ShouldBe(CardPaymentState.InCredit);
    }

    [Fact]
    public async Task Zero_owed_is_settled()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddCardExpense(db, user.Id, card.Id, 100);
        AddPayment(db, user.Id, budget.Id, card.Id, 100, Aug5);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Value.Owed.ShouldBe(0m);
        result.Value.PaymentState.ShouldBe(CardPaymentState.Settled);
    }

    [Fact]
    public async Task Owed_with_no_payment_this_month_is_unpaid()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddCardExpense(db, user.Id, card.Id, 100);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Value.Owed.ShouldBe(100m);
        result.Value.PaidThisMonth.ShouldBe(0m);
        result.Value.PaymentState.ShouldBe(CardPaymentState.Unpaid);
    }

    [Fact]
    public async Task Payments_outside_the_month_are_excluded_but_still_reduce_owed()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddCardExpense(db, user.Id, card.Id, 100);
        AddPayment(db, user.Id, budget.Id, card.Id, 30, Jul20);
        AddPayment(db, user.Id, budget.Id, card.Id, 20, Aug20);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Value.Owed.ShouldBe(50m);
        result.Value.PaidThisMonth.ShouldBe(20m);
        result.Value.Payments.Count.ShouldBe(1);
        result.Value.Payments[0].Date.ShouldBe(Aug20);
    }

    [Fact]
    public async Task Payments_are_listed_newest_first_with_the_source_name()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings", AccountType.Saving);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddPayment(db, user.Id, budget.Id, card.Id, 10, Aug1);
        AddPayment(db, user.Id, savings.Id, card.Id, 20, Aug20);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Value.Payments.Select(p => p.Date).ShouldBe([Aug20, Aug1]);
        result.Value.Payments[0].FromAccountName.ShouldBe("Savings");
        result.Value.Payments[0].FromAccountId.ShouldBe(savings.Id);
        result.Value.Payments[1].FromAccountName.ShouldBe("Budget");
    }

    [Fact]
    public async Task Other_cards_payments_are_not_listed()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        var otherCard = Seed.Account(db, user.Id, "Mastercard", AccountType.CreditCard);
        AddPayment(db, user.Id, budget.Id, otherCard.Id, 75, Aug5);
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Value.Payments.ShouldBeEmpty();
        result.Value.PaidThisMonth.ShouldBe(0m);
    }

    [Fact]
    public async Task Year_and_month_default_to_the_current_month()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        AddPayment(db, user.Id, budget.Id, card.Id, 40, Aug5);
        db.SaveChanges();

        // FixedDateTimeProvider is 2026-08-06.
        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, null, null), CancellationToken.None);

        result.Value.PaidThisMonth.ShouldBe(40m);
    }

    [Fact]
    public async Task Non_card_account_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, budget.Id, 2026, 8), CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.NotCreditCard);
    }

    [Fact]
    public async Task Another_users_card_is_not_found()
    {
        using var db = TestDb.Create();
        var owner = Seed.User(db, "owner@example.com");
        var other = Seed.User(db, "other@example.com");
        var card = Seed.Account(db, owner.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(other.Id, card.Id, 2026, 8), CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.NotFound);
    }

    [Fact]
    public async Task Out_of_range_month_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2026, 13), CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.InvalidMonth);
    }

    [Fact]
    public async Task Out_of_range_year_is_rejected_with_the_year_error()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 1999, 8), CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.InvalidYear);
    }

    [Fact]
    public async Task Out_of_range_year_and_month_reports_the_year_first()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new GetCardStatementQuery(user.Id, card.Id, 2201, 13), CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.InvalidYear);
    }
}
