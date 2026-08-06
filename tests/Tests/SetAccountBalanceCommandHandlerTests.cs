using Application.Accounts.SetBalance;
using Domain.Accounts;
using Domain.Adjustments;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class SetAccountBalanceCommandHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    private static SetAccountBalanceCommandHandler Handler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    [Fact]
    public async Task Raising_the_balance_stores_a_positive_delta()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        db.Adjustments.Add(new Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = account.Id,
            Amount = 1000,
            Date = Date,
        });
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new SetAccountBalanceCommand(user.Id, account.Id, 1500, Date),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Adjustments.Single(a => a.Id == result.Value).Amount.ShouldBe(500m);
    }

    [Fact]
    public async Task Lowering_the_balance_stores_a_negative_delta()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        db.Adjustments.Add(new Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = account.Id,
            Amount = 1000,
            Date = Date,
        });
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new SetAccountBalanceCommand(user.Id, account.Id, 400, Date),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Adjustments.Single(a => a.Id == result.Value).Amount.ShouldBe(-600m);
    }

    [Fact]
    public async Task Setting_the_same_balance_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);

        var result = await Handler(db).Handle(
            new SetAccountBalanceCommand(user.Id, account.Id, 0, Date),
            CancellationToken.None);

        result.Error.ShouldBe(AdjustmentErrors.BalanceUnchanged);
    }

    [Fact]
    public async Task Archived_accounts_cannot_be_adjusted()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var archived = Seed.Account(db, user.Id, archived: true);

        var result = await Handler(db).Handle(
            new SetAccountBalanceCommand(user.Id, archived.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.Archived);
    }
}
