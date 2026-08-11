using Application.Incomes.Latest;
using Domain.Incomes;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class GetLatestIncomeQueryHandlerTests
{
    private static Income AddIncome(
        Infrastructure.Database.ApplicationDbContext db,
        Guid userId,
        decimal amount,
        DateTime createdAtUtc,
        params (Guid AccountId, decimal Amount)[] lines)
    {
        var income = new Income
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Amount = amount,
            Source = "Salary",
            Date = DateOnly.FromDateTime(createdAtUtc),
            CreatedAtUtc = createdAtUtc,
        };
        db.Incomes.Add(income);

        foreach (var line in lines)
        {
            db.IncomeAllocations.Add(new IncomeAllocation
            {
                Id = Guid.NewGuid(),
                IncomeId = income.Id,
                AccountId = line.AccountId,
                Amount = line.Amount,
            });
        }

        db.SaveChanges();
        return income;
    }

    [Fact]
    public async Task Returns_the_most_recently_logged_income_with_its_lines()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings");
        AddIncome(db, user.Id, 1000, new DateTime(2026, 7, 1, 8, 0, 0, DateTimeKind.Utc),
            (budget.Id, 1000));
        var newest = AddIncome(db, user.Id, 2000, new DateTime(2026, 8, 1, 8, 0, 0, DateTimeKind.Utc),
            (budget.Id, 1400), (savings.Id, 600));

        var result = await new GetLatestIncomeQueryHandler(db).Handle(
            new GetLatestIncomeQuery(user.Id), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value.Id.ShouldBe(newest.Id);
        result.Value.Amount.ShouldBe(2000m);
        result.Value.Allocations.Count.ShouldBe(2);
        result.Value.Allocations.Sum(a => a.Amount).ShouldBe(2000m);
    }

    [Fact]
    public async Task No_incomes_yet_answers_not_found()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        var result = await new GetLatestIncomeQueryHandler(db).Handle(
            new GetLatestIncomeQuery(user.Id), CancellationToken.None);

        result.Error.ShouldBe(IncomeErrors.NotFound);
    }

    [Fact]
    public async Task Another_users_income_is_not_returned()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "user@example.com");
        var other = Seed.User(db, "other@example.com");
        var otherAccount = Seed.Account(db, other.Id);
        AddIncome(db, other.Id, 5000, new DateTime(2026, 8, 1, 8, 0, 0, DateTimeKind.Utc),
            (otherAccount.Id, 5000));

        var result = await new GetLatestIncomeQueryHandler(db).Handle(
            new GetLatestIncomeQuery(user.Id), CancellationToken.None);

        result.Error.ShouldBe(IncomeErrors.NotFound);
    }
}
