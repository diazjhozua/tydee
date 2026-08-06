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
        FixedDateTimeProvider clock) =>
        new(db, new FakeTokenProvider(), clock);

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
}
