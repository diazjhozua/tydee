using Application.Incomes;
using Application.Incomes.Create;
using Domain.Incomes;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class CreateIncomeCommandHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    private static CreateIncomeCommandHandler Handler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    [Fact]
    public async Task Allocations_must_sum_to_the_income_amount()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);

        var result = await Handler(db).Handle(
            new CreateIncomeCommand(user.Id, 1000, "Salary", Date,
                [new IncomeAllocationItem(account.Id, 900)]),
            CancellationToken.None);

        result.Error.ShouldBe(IncomeErrors.AllocationMismatch);
    }

    [Fact]
    public async Task Allocating_to_an_archived_account_fails()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var archived = Seed.Account(db, user.Id, archived: true);

        var result = await Handler(db).Handle(
            new CreateIncomeCommand(user.Id, 1000, "Salary", Date,
                [new IncomeAllocationItem(archived.Id, 1000)]),
            CancellationToken.None);

        result.Error.ShouldBe(IncomeErrors.AllocationAccountInvalid);
    }

    [Fact]
    public async Task Allocating_to_another_users_account_fails()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "user@example.com");
        var other = Seed.User(db, "other@example.com");
        var foreign = Seed.Account(db, other.Id);

        var result = await Handler(db).Handle(
            new CreateIncomeCommand(user.Id, 1000, "Salary", Date,
                [new IncomeAllocationItem(foreign.Id, 1000)]),
            CancellationToken.None);

        result.Error.ShouldBe(IncomeErrors.AllocationAccountInvalid);
    }

    [Fact]
    public async Task Valid_income_writes_the_income_and_its_lines()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings");

        var result = await Handler(db).Handle(
            new CreateIncomeCommand(user.Id, 1000, "Salary", Date,
            [
                new IncomeAllocationItem(budget.Id, 700),
                new IncomeAllocationItem(savings.Id, 300),
            ]),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Incomes.Single().Amount.ShouldBe(1000m);
        db.IncomeAllocations.Count().ShouldBe(2);
        db.IncomeAllocations.Sum(a => a.Amount).ShouldBe(1000m);
    }
}
