using Application.Accounts.Update;
using Domain.Accounts;
using Domain.Incomes;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class UpdateAccountCommandHandlerTests
{
    [Fact]
    public async Task Switching_an_allocated_account_to_credit_card_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget", percent: 50);

        var result = await new UpdateAccountCommandHandler(db).Handle(
            new UpdateAccountCommand(user.Id, budget.Id, "Budget", "CreditCard", null, null),
            CancellationToken.None);

        result.Error.ShouldBe(AllocationErrors.CreditCardNotAllocatable);
        db.Accounts.Single().Type.ShouldBe(AccountType.Spending);
    }

    [Fact]
    public async Task Switching_an_unallocated_account_to_credit_card_succeeds()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id, "Visa", percent: 0);

        var result = await new UpdateAccountCommandHandler(db).Handle(
            new UpdateAccountCommand(user.Id, account.Id, "Visa", "CreditCard", null, null),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Accounts.Single().Type.ShouldBe(AccountType.CreditCard);
    }

    [Fact]
    public async Task Switching_an_account_with_allocation_rows_to_credit_card_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id, "Visa", percent: 0);
        db.IncomeAllocations.Add(new IncomeAllocation
        {
            Id = Guid.NewGuid(),
            IncomeId = Guid.NewGuid(),
            AccountId = account.Id,
            Amount = 300,
        });
        db.SaveChanges();

        var result = await new UpdateAccountCommandHandler(db).Handle(
            new UpdateAccountCommand(user.Id, account.Id, "Visa", "CreditCard", null, null),
            CancellationToken.None);

        result.Error.ShouldBe(AllocationErrors.CreditCardHasAllocations);
        db.Accounts.Single().Type.ShouldBe(AccountType.Spending);
    }

    [Fact]
    public async Task Renaming_an_existing_card_with_allocation_rows_is_not_blocked()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard, percent: 0);
        db.IncomeAllocations.Add(new IncomeAllocation
        {
            Id = Guid.NewGuid(),
            IncomeId = Guid.NewGuid(),
            AccountId = card.Id,
            Amount = 300,
        });
        db.SaveChanges();

        var result = await new UpdateAccountCommandHandler(db).Handle(
            new UpdateAccountCommand(user.Id, card.Id, "Visa Gold", "CreditCard", null, null),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Accounts.Single().Name.ShouldBe("Visa Gold");
    }

    [Fact]
    public async Task Renaming_an_existing_card_with_a_nonzero_percent_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard, percent: 20);

        var result = await new UpdateAccountCommandHandler(db).Handle(
            new UpdateAccountCommand(user.Id, card.Id, "Visa Gold", "CreditCard", null, null),
            CancellationToken.None);

        result.Error.ShouldBe(AllocationErrors.CreditCardNotAllocatable);
        db.Accounts.Single().Name.ShouldBe("Visa");
    }
}
