using Application.Accounts;
using Domain.Accounts;
using Domain.Adjustments;
using Domain.Expenses;
using Domain.Incomes;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class BalanceCalculatorTests
{
    [Fact]
    public async Task Balance_is_allocations_minus_expenses_plus_adjustments()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);

        var income = new Income
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Amount = 1000,
            Source = "Salary",
            Date = new DateOnly(2026, 8, 1),
        };
        db.Incomes.Add(income);
        db.IncomeAllocations.Add(new IncomeAllocation
        {
            Id = Guid.NewGuid(),
            IncomeId = income.Id,
            AccountId = account.Id,
            Amount = 700,
        });
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = account.Id,
            Amount = 150,
            Date = new DateOnly(2026, 8, 2),
        });
        db.Adjustments.Add(new Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = account.Id,
            Amount = -50,
            Date = new DateOnly(2026, 8, 3),
        });
        db.SaveChanges();

        Dictionary<Guid, decimal> balances =
            await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);

        balances[account.Id].ShouldBe(500m); // 700 - 150 - 50
    }

    [Fact]
    public async Task Accounts_without_activity_are_absent_and_default_to_zero()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);

        Dictionary<Guid, decimal> balances =
            await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);

        balances.GetValueOrDefault(account.Id).ShouldBe(0m);
    }

    [Fact]
    public async Task Balances_do_not_leak_across_users()
    {
        using var db = TestDb.Create();
        var owner = Seed.User(db, "owner@example.com");
        var other = Seed.User(db, "other@example.com");
        var ownerAccount = Seed.Account(db, owner.Id);

        db.Adjustments.Add(new Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            AccountId = ownerAccount.Id,
            Amount = 999,
            Date = new DateOnly(2026, 8, 1),
        });
        db.SaveChanges();

        Dictionary<Guid, decimal> balances =
            await BalanceCalculator.ForUserAsync(db, other.Id, CancellationToken.None);

        balances.ShouldBeEmpty();
    }

    [Fact]
    public async Task Card_expense_makes_the_card_balance_negative()
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
            Date = new DateOnly(2026, 8, 2),
        });
        db.SaveChanges();

        Dictionary<Guid, decimal> balances =
            await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);

        balances[card.Id].ShouldBe(-100m);
    }

    [Fact]
    public async Task Card_payment_raises_the_card_and_lowers_the_source_by_the_same_amount()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var card = Seed.Account(db, user.Id, "Visa", AccountType.CreditCard);
        db.Adjustments.Add(new Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = budget.Id,
            Amount = 500,
            Date = new DateOnly(2026, 8, 1),
        });
        db.CardPayments.Add(new Domain.CardPayments.CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FromAccountId = budget.Id,
            CardAccountId = card.Id,
            Amount = 200,
            Date = new DateOnly(2026, 8, 3),
        });
        db.SaveChanges();

        Dictionary<Guid, decimal> balances =
            await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);

        balances[budget.Id].ShouldBe(300m);
        balances[card.Id].ShouldBe(200m);
    }
}
