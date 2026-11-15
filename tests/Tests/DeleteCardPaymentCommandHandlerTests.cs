using Application.Accounts;
using Application.CardPayments.Delete;
using Domain.Accounts;
using Domain.CardPayments;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class DeleteCardPaymentCommandHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    [Fact]
    public async Task Deleting_an_owned_payment_removes_it_and_reverts_both_balances()
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
        var payment = new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 200,
            Date = Date,
        };
        db.CardPayments.Add(payment);
        db.SaveChanges();

        var result = await new DeleteCardPaymentCommandHandler(db).Handle(
            new DeleteCardPaymentCommand(user.Id, payment.Id),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.CardPayments.ShouldBeEmpty();

        var balances = await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);
        balances[budget.Id].ShouldBe(1000m);
        balances.GetValueOrDefault(card.Id).ShouldBe(0m);
    }

    [Fact]
    public async Task Deleting_a_payment_on_an_archived_card_is_rejected_and_keeps_the_row()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard, archived: true);
        db.Expenses.Add(new Domain.Expenses.Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = card.Id,
            Amount = 200,
            Date = Date,
        });
        var payment = new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 200,
            Date = Date,
        };
        db.CardPayments.Add(payment);
        db.SaveChanges();

        var result = await new DeleteCardPaymentCommandHandler(db).Handle(
            new DeleteCardPaymentCommand(user.Id, payment.Id),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.Archived);
        db.CardPayments.Count().ShouldBe(1);
    }

    [Fact]
    public async Task Another_user_cannot_delete_the_payment()
    {
        using var db = TestDb.Create();
        var owner = Seed.User(db, "owner@example.com");
        var other = Seed.User(db, "other@example.com");
        var budget = Seed.Account(db, owner.Id, "Budget");
        var card = Seed.Account(db, owner.Id, "Visa", AccountType.CreditCard);
        var payment = new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 200,
            Date = Date,
        };
        db.CardPayments.Add(payment);
        db.SaveChanges();

        var result = await new DeleteCardPaymentCommandHandler(db).Handle(
            new DeleteCardPaymentCommand(other.Id, payment.Id),
            CancellationToken.None);

        result.Error.ShouldBe(CardPaymentErrors.NotFound);
        db.CardPayments.Count().ShouldBe(1);
    }
}
