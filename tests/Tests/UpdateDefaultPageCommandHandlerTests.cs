using Application.Users.Me;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class UpdateDefaultPageCommandHandlerTests
{
    [Fact]
    public async Task Sets_the_default_page_for_the_user()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        var result = await new UpdateDefaultPageCommandHandler(db).Handle(
            new UpdateDefaultPageCommand(user.Id, DefaultPages.LogExpense),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Users.Single().DefaultPage.ShouldBe(DefaultPages.LogExpense);
    }

    [Fact]
    public async Task Normalizes_the_value_case_insensitively()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        await new UpdateDefaultPageCommandHandler(db).Handle(
            new UpdateDefaultPageCommand(user.Id, "logexpense"),
            CancellationToken.None);

        db.Users.Single().DefaultPage.ShouldBe(DefaultPages.LogExpense);
    }

    [Fact]
    public async Task Updating_unknown_user_returns_not_found()
    {
        using var db = TestDb.Create();

        var result = await new UpdateDefaultPageCommandHandler(db).Handle(
            new UpdateDefaultPageCommand(Guid.NewGuid(), DefaultPages.Home),
            CancellationToken.None);

        result.Error.ShouldBe(UserErrors.NotFound);
    }
}
