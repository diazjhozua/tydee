using Application.Accounts;
using Application.Transfers.Create;
using Domain.Accounts;
using Domain.Transfers;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class TransferTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    private static CreateTransferCommandHandler Handler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    [Fact]
    public async Task Transferring_moves_balance_from_one_account_to_another()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings");
        db.Adjustments.Add(new Domain.Adjustments.Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = budget.Id,
            Amount = 1000,
            Date = Date,
        });
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new CreateTransferCommand(user.Id, budget.Id, savings.Id, 300, Date),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();

        var balances = await BalanceCalculator.ForUserAsync(db, user.Id, CancellationToken.None);
        balances[budget.Id].ShouldBe(700m);
        balances[savings.Id].ShouldBe(300m);
    }

    [Fact]
    public async Task Cannot_transfer_to_the_same_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);

        var result = await Handler(db).Handle(
            new CreateTransferCommand(user.Id, account.Id, account.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(TransferErrors.SameAccount);
    }

    [Fact]
    public async Task Cannot_transfer_involving_an_archived_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var active = Seed.Account(db, user.Id, "Budget");
        var archived = Seed.Account(db, user.Id, "Old", archived: true);

        var result = await Handler(db).Handle(
            new CreateTransferCommand(user.Id, active.Id, archived.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.Archived);
    }

    [Fact]
    public async Task Cannot_transfer_involving_another_users_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "user@example.com");
        var other = Seed.User(db, "other@example.com");
        var mine = Seed.Account(db, user.Id, "Budget");
        var foreign = Seed.Account(db, other.Id, "Theirs");

        var result = await Handler(db).Handle(
            new CreateTransferCommand(user.Id, mine.Id, foreign.Id, 100, Date),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.NotFound);
    }
}
