using Application.Admin.UpdateUser;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class UpdateUserCommandHandlerTests
{
    private static UpdateUserCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock) =>
        new(db, clock);

    private static void AddActiveSession(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        Guid userId,
        string token)
    {
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = token,
            ExpiresOnUtc = clock.UtcNow.AddDays(5),
        });
        db.SaveChanges();
    }

    [Fact]
    public async Task Locking_sets_IsLocked_and_revokes_every_active_session()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var admin = Seed.User(db, "admin@example.com");
        var member = Seed.User(db, "member@example.com");
        AddActiveSession(db, clock, member.Id, "h:one");
        AddActiveSession(db, clock, member.Id, "h:two");

        var result = await Handler(db, clock).Handle(
            new UpdateUserCommand(member.Id, null, true, admin.Id), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        User saved = db.Users.Single(u => u.Id == member.Id);
        saved.IsLocked.ShouldBeTrue();
        saved.LockoutEndUtc.ShouldBeNull();
        db.RefreshTokens
            .Where(t => t.UserId == member.Id)
            .AsEnumerable()
            .ShouldAllBe(t => t.RevokedAt == clock.UtcNow);
    }

    [Fact]
    public async Task Admin_cannot_lock_their_own_account()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var admin = Seed.User(db, "admin@example.com");
        AddActiveSession(db, clock, admin.Id, "h:mine");

        var result = await Handler(db, clock).Handle(
            new UpdateUserCommand(admin.Id, null, true, admin.Id), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.CannotLockSelf);
        db.Users.Single().IsLocked.ShouldBeFalse();
        db.RefreshTokens.Single().RevokedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Unlocking_clears_the_lock_and_failed_login_state()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var admin = Seed.User(db, "admin@example.com");
        var member = Seed.User(db, "member@example.com");
        member.IsLocked = true;
        member.LockoutEndUtc = clock.UtcNow.AddMinutes(10);
        member.FailedLoginAttempts = 3;
        db.SaveChanges();

        var result = await Handler(db, clock).Handle(
            new UpdateUserCommand(member.Id, null, false, admin.Id), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        User saved = db.Users.Single(u => u.Id == member.Id);
        saved.IsLocked.ShouldBeFalse();
        saved.LockoutEndUtc.ShouldBeNull();
        saved.FailedLoginAttempts.ShouldBe(0);
    }

    [Fact]
    public async Task Unknown_user_returns_NotFound()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var admin = Seed.User(db, "admin@example.com");

        var result = await Handler(db, clock).Handle(
            new UpdateUserCommand(Guid.NewGuid(), null, true, admin.Id), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.NotFound);
    }
}
