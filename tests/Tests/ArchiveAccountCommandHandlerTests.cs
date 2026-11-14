using Application.Accounts.Archive;
using Domain.Accounts;
using Domain.CardPayments;
using Domain.Expenses;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ArchiveAccountCommandHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    [Fact]
    public async Task Card_with_an_owed_balance_cannot_be_archived()
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
        });
        db.SaveChanges();

        var result = await new ArchiveAccountCommandHandler(db).Handle(
            new ArchiveAccountCommand(user.Id, card.Id),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.HasOwedBalance);
        db.Accounts.Single().IsArchived.ShouldBeFalse();
    }

    [Fact]
    public async Task Card_with_zero_owed_can_be_archived()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = card.Id,
            Amount = 100,
            Date = Date,
        });
        db.CardPayments.Add(new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 100,
            Date = Date,
        });
        db.SaveChanges();

        var result = await new ArchiveAccountCommandHandler(db).Handle(
            new ArchiveAccountCommand(user.Id, card.Id),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Accounts.Single(a => a.Id == card.Id).IsArchived.ShouldBeTrue();
    }

    [Fact]
    public async Task Card_in_credit_cannot_be_archived()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = card.Id,
            Amount = 100,
            Date = Date,
        });
        db.CardPayments.Add(new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 150,
            Date = Date,
        });
        db.SaveChanges();

        var result = await new ArchiveAccountCommandHandler(db).Handle(
            new ArchiveAccountCommand(user.Id, card.Id),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.CardHasCredit);
        db.Accounts.Single(a => a.Id == card.Id).IsArchived.ShouldBeFalse();
    }

    [Fact]
    public async Task Card_with_no_activity_can_be_archived()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);

        var result = await new ArchiveAccountCommandHandler(db).Handle(
            new ArchiveAccountCommand(user.Id, card.Id),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Spending_account_with_a_nonzero_balance_can_still_be_archived()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget", percent: 40);
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = budget.Id,
            Amount = 100,
            Date = Date,
        });
        db.SaveChanges();

        var result = await new ArchiveAccountCommandHandler(db).Handle(
            new ArchiveAccountCommand(user.Id, budget.Id),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        var archived = db.Accounts.Single(a => a.Id == budget.Id);
        archived.IsArchived.ShouldBeTrue();
        archived.AllocationPercent.ShouldBe(0m);
    }
}
