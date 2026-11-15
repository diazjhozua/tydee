using Application.Accounts;
using Application.CardPayments.Create;
using Domain.Accounts;
using Domain.CardPayments;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class CreateCardPaymentCommandHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    private static CreateCardPaymentCommandHandler Handler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    [Fact]
    public async Task Valid_payment_is_saved_and_returns_its_id()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, budget.Id, card.Id, 250, Date),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        CardPayment saved = db.CardPayments.Single();
        result.Value.ShouldBe(saved.Id);
        saved.UserId.ShouldBe(user.Id);
        saved.FromAccountId.ShouldBe(budget.Id);
        saved.CardAccountId.ShouldBe(card.Id);
        saved.Amount.ShouldBe(250m);
        saved.Date.ShouldBe(Date);
    }

    [Fact]
    public async Task Overpayment_is_allowed()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, budget.Id, card.Id, 500, Date),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Cannot_pay_a_card_from_itself()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, card.Id, card.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.SameAccount);
    }

    [Fact]
    public async Task Cannot_pay_into_a_non_card_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings", AccountType.Saving);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, budget.Id, savings.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.NotCreditCard);
    }

    [Fact]
    public async Task Cannot_pay_from_a_credit_card()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var visa = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        var mastercard = Seed.Account(db, user.Id, "Mastercard", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, visa.Id, mastercard.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.SourceIsCreditCard);
    }

    [Fact]
    public async Task Cannot_pay_involving_an_archived_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Old Visa", AccountType.CreditCard, archived: true);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, budget.Id, card.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.Archived);
    }

    [Fact]
    public async Task Cannot_pay_involving_another_users_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "user@example.com");
        var other = Seed.User(db, "other@example.com");
        var budget = Seed.Account(db, user.Id, "Budget");
        var foreignCard = Seed.Account(db, other.Id, "Theirs", AccountType.CreditCard);

        var result = await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, budget.Id, foreignCard.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.NotFound);
        db.CardPayments.ShouldBeEmpty();
    }

    [Fact]
    public async Task Payment_moves_money_from_the_source_onto_the_card()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        db.Adjustments.Add(new Domain.Adjustments.Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = budget.Id,
            Amount = 1000,
            Date = Date,
        });
        db.SaveChanges();

        await Handler(db).Handle(
            new CreateCardPaymentCommand(user.Id, budget.Id, card.Id, 200, Date),
            CancellationToken.None);

        var balances = await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);
        balances[budget.Id].ShouldBe(800m);
        balances[card.Id].ShouldBe(200m);
    }
}
