using Application.Users.Logout;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class LogoutCommandHandlerTests
{
    private static LogoutCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock) =>
        new(db, new FakeTokenProvider(), clock);

    private static void AddSession(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        Guid userId,
        string rawToken,
        DateTime? revokedAt = null)
    {
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = $"h:{rawToken}",
            ExpiresOnUtc = clock.UtcNow.AddDays(7),
            RevokedAt = revokedAt,
        });
        db.SaveChanges();
    }

    [Fact]
    public async Task Logout_ends_every_active_session_of_the_user()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        AddSession(db, clock, user.Id, "this-browser");
        AddSession(db, clock, user.Id, "other-device");

        var result = await Handler(db, clock).Handle(new LogoutCommand("this-browser"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.RefreshTokens.AsEnumerable().ShouldAllBe(t => t.RevokedAt == clock.UtcNow);
    }

    [Fact]
    public async Task A_rotated_token_still_ends_the_newer_session()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        AddSession(db, clock, user.Id, "rotated-away", revokedAt: clock.UtcNow.AddMinutes(-1));
        AddSession(db, clock, user.Id, "newer");

        var result = await Handler(db, clock).Handle(new LogoutCommand("rotated-away"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.RefreshTokens.Single(t => t.Token == "h:newer").RevokedAt.ShouldBe(clock.UtcNow);
    }

    [Fact]
    public async Task Unknown_token_ends_nothing()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        AddSession(db, clock, user.Id, "active");

        var result = await Handler(db, clock).Handle(new LogoutCommand("unknown"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.RefreshTokens.Single().RevokedAt.ShouldBeNull();
    }
}
