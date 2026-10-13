using Application.Expenses.Create;
using Application.RecurringExpenses.Archive;
using Application.RecurringExpenses.Create;
using Application.RecurringExpenses.List;
using Domain.Accounts;
using Domain.RecurringExpenses;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class RecurringExpenseCommandHandlerTests
{
    private static readonly DateOnly Date = new(2026, 8, 6);

    private static RecurringExpense SeedTemplate(
        Infrastructure.Database.ApplicationDbContext db,
        Guid userId,
        Guid accountId,
        string name = "Rent",
        bool archived = false)
    {
        var template = new RecurringExpense
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            AccountId = accountId,
            Amount = 500,
            Category = "Home",
            Note = "Monthly",
            IsArchived = archived,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.RecurringExpenses.Add(template);
        db.SaveChanges();
        return template;
    }

    [Fact]
    public async Task Creating_a_template_persists_it_for_the_user()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);

        var result = await new CreateRecurringExpenseCommandHandler(db, clock).Handle(
            new CreateRecurringExpenseCommand(user.Id, "Rent", account.Id, 500, "Home", "Monthly"),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        RecurringExpense saved = db.RecurringExpenses.Single();
        saved.Id.ShouldBe(result.Value);
        saved.UserId.ShouldBe(user.Id);
        saved.Name.ShouldBe("Rent");
        saved.AccountId.ShouldBe(account.Id);
        saved.Amount.ShouldBe(500);
        saved.Category.ShouldBe("Home");
        saved.Note.ShouldBe("Monthly");
        saved.IsArchived.ShouldBeFalse();
        saved.CreatedAtUtc.ShouldBe(clock.UtcNow);
    }

    [Fact]
    public async Task Creating_with_another_users_account_returns_not_found()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        var other = Seed.User(db, "other@example.com");
        var otherAccount = Seed.Account(db, other.Id);

        var result = await new CreateRecurringExpenseCommandHandler(db, clock).Handle(
            new CreateRecurringExpenseCommand(user.Id, "Rent", otherAccount.Id, 500, null, null),
            CancellationToken.None);

        result.Error.ShouldBe(AccountErrors.NotFound);
        db.RecurringExpenses.ShouldBeEmpty();
    }

    [Fact]
    public async Task Archiving_a_template_sets_the_flag()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        var template = SeedTemplate(db, user.Id, account.Id);

        var result = await new ArchiveRecurringExpenseCommandHandler(db).Handle(
            new ArchiveRecurringExpenseCommand(user.Id, template.Id),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.RecurringExpenses.Single(r => r.Id == template.Id).IsArchived.ShouldBeTrue();
    }

    [Fact]
    public async Task Archiving_twice_returns_archived()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        var template = SeedTemplate(db, user.Id, account.Id, archived: true);

        var result = await new ArchiveRecurringExpenseCommandHandler(db).Handle(
            new ArchiveRecurringExpenseCommand(user.Id, template.Id),
            CancellationToken.None);

        result.Error.ShouldBe(RecurringExpenseErrors.Archived);
    }

    [Fact]
    public async Task Listing_excludes_archived_templates_by_default()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        SeedTemplate(db, user.Id, account.Id, "Rent");
        SeedTemplate(db, user.Id, account.Id, "Old gym", archived: true);

        var result = await new ListRecurringExpensesQueryHandler(db).Handle(
            new ListRecurringExpensesQuery(user.Id, IncludeArchived: false),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldHaveSingleItem().Name.ShouldBe("Rent");
    }

    [Fact]
    public async Task Creating_an_expense_with_a_template_stores_the_link()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        var account = Seed.Account(db, user.Id);
        var template = SeedTemplate(db, user.Id, account.Id);

        var result = await new CreateExpenseCommandHandler(db, clock).Handle(
            new CreateExpenseCommand(user.Id, account.Id, 500, null, null, Date, template.Id),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Expenses.Single().RecurringExpenseId.ShouldBe(template.Id);
    }

    [Fact]
    public async Task Creating_an_expense_with_another_users_template_returns_not_found()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        var other = Seed.User(db, "other@example.com");
        var account = Seed.Account(db, user.Id);
        var otherAccount = Seed.Account(db, other.Id);
        var template = SeedTemplate(db, other.Id, otherAccount.Id);

        var result = await new CreateExpenseCommandHandler(db, clock).Handle(
            new CreateExpenseCommand(user.Id, account.Id, 500, null, null, Date, template.Id),
            CancellationToken.None);

        result.Error.ShouldBe(RecurringExpenseErrors.NotFound);
        db.Expenses.ShouldBeEmpty();
    }
}