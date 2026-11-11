using Application.Users.Me;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class GetMeQueryHandlerTests
{
    [Fact]
    public async Task Returns_the_default_page_when_set()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        user.DefaultPage = DefaultPages.LogExpense;
        db.SaveChanges();

        var result = await new GetMeQueryHandler(db).Handle(
            new GetMeQuery(user.Id), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value.DefaultPage.ShouldBe(DefaultPages.LogExpense);
    }

    [Fact]
    public async Task Returns_null_default_page_when_never_set()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        var result = await new GetMeQueryHandler(db).Handle(
            new GetMeQuery(user.Id), CancellationToken.None);

        result.Value.DefaultPage.ShouldBeNull();
    }

    [Fact]
    public async Task Unknown_user_returns_not_found()
    {
        using var db = TestDb.Create();

        var result = await new GetMeQueryHandler(db).Handle(
            new GetMeQuery(Guid.NewGuid()), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.NotFound);
    }
}
