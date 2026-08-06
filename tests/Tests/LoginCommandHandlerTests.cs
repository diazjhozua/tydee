using Application.Users.Login;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class LoginCommandHandlerTests
{
    private static LoginCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider? clock = null) =>
        new(db, new FakePasswordHasher(), new FakeTokenProvider(), clock ?? new FixedDateTimeProvider());

    [Fact]
    public async Task Wrong_email_and_wrong_password_return_the_same_error()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");

        var handler = Handler(db);

        var unknownEmail = await handler.Handle(
            new LoginCommand("unknown@example.com", "Password123!"), CancellationToken.None);
        var wrongPassword = await handler.Handle(
            new LoginCommand("known@example.com", "WrongPassword"), CancellationToken.None);

        unknownEmail.Error.ShouldBe(UserErrors.InvalidCredentials);
        wrongPassword.Error.ShouldBe(UserErrors.InvalidCredentials);
    }

    [Fact]
    public async Task Five_failures_lock_the_account_for_fifteen_minutes()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var clock = new FixedDateTimeProvider();
        var handler = Handler(db, clock);

        for (int i = 0; i < 5; i++)
        {
            await handler.Handle(new LoginCommand(user.Email, "WrongPassword"), CancellationToken.None);
        }

        db.Users.Single().LockoutEndUtc.ShouldBe(clock.UtcNow.AddMinutes(15));
    }

    [Fact]
    public async Task Correct_password_during_lockout_still_answers_invalid_credentials()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var clock = new FixedDateTimeProvider();
        user.LockoutEndUtc = clock.UtcNow.AddMinutes(10);
        db.SaveChanges();

        var result = await Handler(db, clock).Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidCredentials);
    }

    [Fact]
    public async Task Successful_login_resets_the_failure_counter()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        user.FailedLoginAttempts = 3;
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Users.Single().FailedLoginAttempts.ShouldBe(0);
    }

    [Fact]
    public async Task Unverified_email_is_rejected_after_the_password_check()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);

        var result = await Handler(db).Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.EmailNotVerified);
    }

    [Fact]
    public async Task Successful_login_stores_a_hashed_refresh_token()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        var result = await Handler(db).Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.RefreshTokens.Single().Token.ShouldBe($"h:{result.Value.RefreshToken}");
    }
}
