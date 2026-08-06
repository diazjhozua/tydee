using Application.Users.ResetPassword;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ResetPasswordCommandHandlerTests
{
    private static ResetPasswordCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock) =>
        new(db, new FakePasswordHasher(), new FakeTokenProvider(), clock);

    [Fact]
    public async Task Unknown_token_is_rejected()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        Seed.User(db);

        var result = await Handler(db, clock).Handle(
            new ResetPasswordCommand("nope", "NewPassword1"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidResetToken);
    }

    [Fact]
    public async Task Expired_token_is_rejected()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.PasswordResetTokenHash = "h:reset-raw";
        user.PasswordResetTokenExpiresAt = clock.UtcNow.AddMinutes(-1);
        db.SaveChanges();

        var result = await Handler(db, clock).Handle(
            new ResetPasswordCommand("reset-raw", "NewPassword1"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidResetToken);
    }

    [Fact]
    public async Task Successful_reset_clears_lockout_and_revokes_sessions()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.PasswordResetTokenHash = "h:reset-raw";
        user.PasswordResetTokenExpiresAt = clock.UtcNow.AddMinutes(30);
        user.FailedLoginAttempts = 4;
        user.LockoutEndUtc = clock.UtcNow.AddMinutes(10);
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = "h:session",
            ExpiresOnUtc = clock.UtcNow.AddDays(5),
        });
        db.SaveChanges();

        var result = await Handler(db, clock).Handle(
            new ResetPasswordCommand("reset-raw", "NewPassword1"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        User saved = db.Users.Single();
        saved.PasswordHash.ShouldBe("#NewPassword1");
        saved.PasswordResetTokenHash.ShouldBeNull();
        saved.FailedLoginAttempts.ShouldBe(0);
        saved.LockoutEndUtc.ShouldBeNull();
        db.RefreshTokens.Single().RevokedAt.ShouldNotBeNull();
    }

    [Fact]
    public async Task Reset_tokens_are_single_use()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);
        user.PasswordResetTokenHash = "h:reset-raw";
        user.PasswordResetTokenExpiresAt = clock.UtcNow.AddMinutes(30);
        db.SaveChanges();

        var handler = Handler(db, clock);
        await handler.Handle(new ResetPasswordCommand("reset-raw", "NewPassword1"), CancellationToken.None);
        var replay = await handler.Handle(
            new ResetPasswordCommand("reset-raw", "AnotherPass1"), CancellationToken.None);

        replay.Error.ShouldBe(UserErrors.InvalidResetToken);
    }
}
