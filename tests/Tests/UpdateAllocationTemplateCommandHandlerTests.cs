using Application.Accounts.UpdateAllocationTemplate;
using Domain.Accounts;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class UpdateAllocationTemplateCommandHandlerTests
{
    [Fact]
    public async Task Percents_must_total_exactly_one_hundred()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings");

        var handler = new UpdateAllocationTemplateCommandHandler(db);

        var result = await handler.Handle(
            new UpdateAllocationTemplateCommand(user.Id,
            [
                new AllocationTemplateItem(budget.Id, 60),
                new AllocationTemplateItem(savings.Id, 30),
            ]),
            CancellationToken.None);

        result.Error.ShouldBe(AllocationErrors.MustTotal100);
    }

    [Fact]
    public async Task Every_active_account_must_be_covered()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        Seed.Account(db, user.Id, "Savings");

        var handler = new UpdateAllocationTemplateCommandHandler(db);

        var result = await handler.Handle(
            new UpdateAllocationTemplateCommand(user.Id,
                [new AllocationTemplateItem(budget.Id, 100)]),
            CancellationToken.None);

        result.Error.ShouldBe(AllocationErrors.AllAccountsRequired);
    }

    [Fact]
    public async Task Valid_template_updates_every_percent()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var budget = Seed.Account(db, user.Id, "Budget");
        var savings = Seed.Account(db, user.Id, "Savings");

        var handler = new UpdateAllocationTemplateCommandHandler(db);

        var result = await handler.Handle(
            new UpdateAllocationTemplateCommand(user.Id,
            [
                new AllocationTemplateItem(budget.Id, 70),
                new AllocationTemplateItem(savings.Id, 30),
            ]),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Accounts.Single(a => a.Id == budget.Id).AllocationPercent.ShouldBe(70m);
        db.Accounts.Single(a => a.Id == savings.Id).AllocationPercent.ShouldBe(30m);
    }
}
