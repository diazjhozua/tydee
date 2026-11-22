using Application.Users.RefreshToken;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class RefreshTokenCommandHandlerTests
{
    private static RefreshTokenCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        FakeAdminProvider? adminProvider = null) =>
        new(db, new FakeTokenProvider(), adminProvider ?? new FakeAdminProvider(), clock);

    private static RefreshToken Token(
        Infrastructure.Database.ApplicationDbContext db,
        Guid userId,
        string raw,
        DateTime expires,
        DateTime? revokedAt = null)
    {
        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = $"h:{raw}",
            ExpiresOnUtc = expires,
            RevokedAt = revokedAt,
        };
        db.RefreshTokens.Add(token);
        db.SaveChanges();
        return token;
    }

    [Fact]
    public async Task Refreshing_rotates_the_token_and_revokes_the_old_one()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        var old = Token(db, user.Id, "old-raw", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock).Handle(
            new RefreshTokenCommand("old-raw"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.RefreshTokens.Single(t => t.Id == old.Id).RevokedAt.ShouldNotBeNull();
        db.RefreshTokens.Count(t => t.RevokedAt == null).ShouldBe(1);
    }

    [Fact]
    public async Task Replaying_a_revoked_token_revokes_every_active_session()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        Token(db, user.Id, "stolen", clock.UtcNow.AddDays(5), revokedAt: clock.UtcNow.AddMinutes(-5));
        var active = Token(db, user.Id, "active", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock).Handle(
            new RefreshTokenCommand("stolen"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.TokenReuseDetected);
        db.RefreshTokens.Single(t => t.Id == active.Id).RevokedAt.ShouldNotBeNull();
    }

    [Fact]
    public async Task Expired_tokens_are_rejected()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        Token(db, user.Id, "expired", clock.UtcNow.AddMinutes(-1));

        var result = await Handler(db, clock).Handle(
            new RefreshTokenCommand("expired"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidRefreshToken);
    }

    [Fact]
    public async Task Admin_locked_user_cannot_refresh_and_the_token_is_left_alone()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.IsLocked = true;
        db.SaveChanges();
        var active = Token(db, user.Id, "active", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock).Handle(
            new RefreshTokenCommand("active"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidRefreshToken);
        db.RefreshTokens.Single(t => t.Id == active.Id).RevokedAt.ShouldBeNull();
        db.RefreshTokens.Count().ShouldBe(1);
    }

    [Fact]
    public async Task Unverified_user_cannot_refresh()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db, verified: false);
        Token(db, user.Id, "active", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock).Handle(
            new RefreshTokenCommand("active"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidRefreshToken);
    }

    [Fact]
    public async Task Locked_user_replaying_a_revoked_token_still_revokes_every_session()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.IsLocked = true;
        db.SaveChanges();
        Token(db, user.Id, "stolen", clock.UtcNow.AddDays(5), revokedAt: clock.UtcNow.AddMinutes(-5));
        var active = Token(db, user.Id, "active", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock).Handle(
            new RefreshTokenCommand("stolen"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.TokenReuseDetected);
        db.RefreshTokens.Single(t => t.Id == active.Id).RevokedAt.ShouldNotBeNull();
    }

    [Fact]
    public async Task Refresh_demotes_an_admin_who_is_no_longer_on_the_allowlist()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.IsAdmin = true;
        db.SaveChanges();
        Token(db, user.Id, "active", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock, new FakeAdminProvider()).Handle(
            new RefreshTokenCommand("active"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.ChangeTracker.Clear();
        db.Users.Single().IsAdmin.ShouldBeFalse();
        result.Value.AccessToken.ShouldNotEndWith("-admin");
    }

    [Fact]
    public async Task Refresh_promotes_a_user_added_to_the_allowlist()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        Token(db, user.Id, "active", clock.UtcNow.AddDays(5));

        var result = await Handler(db, clock, new FakeAdminProvider(user.Email)).Handle(
            new RefreshTokenCommand("active"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.ChangeTracker.Clear();
        db.Users.Single().IsAdmin.ShouldBeTrue();
        result.Value.AccessToken.ShouldEndWith("-admin");
    }

    [Fact]
    public async Task Replaying_a_revoked_token_does_not_sync_the_admin_flag()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.IsAdmin = true;
        db.SaveChanges();
        Token(db, user.Id, "stolen", clock.UtcNow.AddDays(5), revokedAt: clock.UtcNow.AddMinutes(-5));

        var result = await Handler(db, clock, new FakeAdminProvider()).Handle(
            new RefreshTokenCommand("stolen"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.TokenReuseDetected);
        db.Users.Single().IsAdmin.ShouldBeTrue();
    }
}
