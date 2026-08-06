using Application.Accounts;
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
}
