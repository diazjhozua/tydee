using Application.Expenses.List;
using Domain.Expenses;
using Infrastructure.Database;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ListExpensesQueryHandlerTests
{
    private static readonly DateOnly Today = new(2026, 11, 11);

    private static void AddExpense(
        ApplicationDbContext db,
        Guid userId,
        Guid accountId,
        DateOnly date,
        decimal amount = 100,
        string? note = null)
    {
        db.Expenses.Add(new Expense
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountId = accountId,
            Amount = amount,
            Note = note,
            Date = date,
            CreatedAtUtc = DateTime.UtcNow,
        });
        db.SaveChanges();
    }

    [Fact]
    public async Task Date_filter_returns_only_that_day()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        AddExpense(db, user.Id, account.Id, Today.AddDays(-1), note: "yesterday");
        AddExpense(db, user.Id, account.Id, Today, note: "today");

        var result = await new ListExpensesQueryHandler(db).Handle(
            new ListExpensesQuery(user.Id, null, null, null, 1, 20, null, Today),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldHaveSingleItem().Note.ShouldBe("today");
    }

    [Fact]
    public async Task Omitting_the_date_returns_all_days()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        AddExpense(db, user.Id, account.Id, Today.AddDays(-1));
        AddExpense(db, user.Id, account.Id, Today);

        var result = await new ListExpensesQueryHandler(db).Handle(
            new ListExpensesQuery(user.Id, null, null, null, 1, 20),
            CancellationToken.None);

        result.Value.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Another_users_expense_on_the_same_day_is_excluded()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var other = Seed.User(db, "other@example.com");
        var otherAccount = Seed.Account(db, other.Id);
        AddExpense(db, other.Id, otherAccount.Id, Today);

        var result = await new ListExpensesQueryHandler(db).Handle(
            new ListExpensesQuery(user.Id, null, null, null, 1, 20, null, Today),
            CancellationToken.None);

        result.Value.ShouldBeEmpty();
    }

    [Fact]
    public async Task Date_filter_keeps_newest_first_ordering()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        var older = new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = account.Id,
            Amount = 50,
            Date = Today,
            CreatedAtUtc = DateTime.UtcNow.AddMinutes(-5),
        };
        var newer = new Expense
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AccountId = account.Id,
            Amount = 75,
            Date = Today,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Expenses.AddRange(older, newer);
        db.SaveChanges();

        var result = await new ListExpensesQueryHandler(db).Handle(
            new ListExpensesQuery(user.Id, null, null, null, 1, 20, null, Today),
            CancellationToken.None);

        result.Value.Select(e => e.Id).ShouldBe([newer.Id, older.Id]);
    }
}
