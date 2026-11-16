using Application.Admin.ListUsers;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ListUsersQueryHandlerTests
{
    private static ListUsersQueryHandler Handler(Infrastructure.Database.ApplicationDbContext db) => new(db);

    [Fact]
    public async Task Shows_IsLocked_from_the_admin_lock_flag()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "locked@example.com");
        user.IsLocked = true;
        db.SaveChanges();

        var result = await Handler(db).Handle(new ListUsersQuery(1, 50), CancellationToken.None);

        result.Value.Single().IsLocked.ShouldBeTrue();
    }

    [Fact]
    public async Task Failed_login_lockout_is_not_reported_as_locked()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "failed@example.com");
        user.LockoutEndUtc = DateTime.UtcNow.AddMinutes(10);
        db.SaveChanges();

        var result = await Handler(db).Handle(new ListUsersQuery(1, 50), CancellationToken.None);

        result.Value.Single().IsLocked.ShouldBeFalse();
    }

    [Fact]
    public async Task Empty_database_returns_no_users()
    {
        using var db = TestDb.Create();

        var result = await Handler(db).Handle(new ListUsersQuery(1, 50), CancellationToken.None);

        result.Value.ShouldBeEmpty();
    }
}
