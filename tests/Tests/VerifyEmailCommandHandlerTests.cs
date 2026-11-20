using Application.Users.VerifyEmail;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class VerifyEmailCommandHandlerTests
{
    private const string Code = "123456";

    // The account as registration leaves it: unverified, empty hash, a live code bound to "session-1",
    // and the registration password waiting in the verification row.
    private static User PendingAccount(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        FakeVerificationSecrets secrets,
        string? pendingPassword = "#Password123!",
        int attempts = 0)
    {
        User user = Seed.User(db, "pending@example.com", verified: false);
        user.PasswordHash = string.Empty;
        db.SaveChanges();

        Seed.Verification(
            db,
            user,
            sessionHash: secrets.HashSessionSecret("session-1"),
            codeHash: secrets.HashCode(user.Id, Code),
            codeExpiresOn: clock.UtcNow.AddMinutes(15),
            lastIssuedOn: clock.UtcNow,
            attempts: attempts,
            pendingPasswordHash: pendingPassword);

        return user;
    }

    private static VerifyEmailCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        FakeVerificationSecrets secrets) =>
        new(db, secrets, clock);

    [Fact]
    public async Task Right_code_from_the_registering_browser_verifies_and_makes_the_registration_password_live()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        result.Value!.HasPassword.ShouldBeTrue();

        User saved = db.Users.Single();
        saved.IsEmailVerified.ShouldBeTrue();
        saved.PasswordHash.ShouldBe("#Password123!");
        db.EmailVerifications.ShouldBeEmpty();
    }

    [Fact]
    public async Task Code_without_the_bound_browser_secret_fails_and_changes_nothing()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, "someone-else"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        db.Users.Single().IsEmailVerified.ShouldBeFalse();
        db.EmailVerifications.Single().Attempts.ShouldBe(0);
    }

    [Fact]
    public async Task Missing_browser_secret_fails_with_the_same_error()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, string.Empty), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        db.Users.Single().IsEmailVerified.ShouldBeFalse();
    }

    [Fact]
    public async Task Wrong_code_is_counted_and_saved()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand("000000", "session-1"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        EmailVerification saved = db.EmailVerifications.Single();
        saved.Attempts.ShouldBe(1);
        saved.CodeHash.ShouldNotBeNull();
        db.Users.Single().IsEmailVerified.ShouldBeFalse();
    }

    [Fact]
    public async Task Fifth_wrong_code_ends_the_live_code_so_the_right_one_no_longer_works()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);
        var handler = Handler(db, clock, secrets);

        for (int guess = 0; guess < EmailVerification.MaxAttempts; guess++)
        {
            (await handler.Handle(new VerifyEmailCommand("000000", "session-1"), CancellationToken.None))
                .Error.ShouldBe(UserErrors.InvalidVerificationToken);
        }

        EmailVerification spent = db.EmailVerifications.Single();
        spent.Attempts.ShouldBe(EmailVerification.MaxAttempts);
        spent.CodeHash.ShouldBeNull();

        var right = await handler.Handle(new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        right.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        db.Users.Single().IsEmailVerified.ShouldBeFalse();
    }

    [Fact]
    public async Task Expired_code_fails_and_does_not_count_as_a_guess()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);

        EmailVerification verification = db.EmailVerifications.Single();
        verification.CodeExpiresOnUtc = clock.UtcNow.AddMinutes(-1);
        db.SaveChanges();

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        db.EmailVerifications.Single().Attempts.ShouldBe(0);
        db.Users.Single().IsEmailVerified.ShouldBeFalse();
    }

    [Fact]
    public async Task Code_cannot_be_used_twice()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets);
        var handler = Handler(db, clock, secrets);

        (await handler.Handle(new VerifyEmailCommand(Code, "session-1"), CancellationToken.None))
            .IsSuccess.ShouldBeTrue();

        var replay = await handler.Handle(new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        replay.Error.ShouldBe(UserErrors.InvalidVerificationToken);
    }

    [Fact]
    public async Task Account_with_no_pending_password_verifies_with_an_empty_password()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        PendingAccount(db, clock, secrets, pendingPassword: null);

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        result.Value!.HasPassword.ShouldBeFalse();

        User saved = db.Users.Single();
        saved.IsEmailVerified.ShouldBeTrue();
        saved.PasswordHash.ShouldBe(string.Empty);
    }

    [Fact]
    public async Task Locked_account_fails_and_its_pending_verification_is_removed()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        User user = PendingAccount(db, clock, secrets);
        user.IsLocked = true;
        db.SaveChanges();

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        db.Users.Single().IsEmailVerified.ShouldBeFalse();
        db.EmailVerifications.ShouldBeEmpty();
    }

    [Fact]
    public async Task Already_verified_account_with_a_stale_row_fails_and_the_row_is_removed()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        User user = PendingAccount(db, clock, secrets);
        user.IsEmailVerified = true;
        db.SaveChanges();

        var result = await Handler(db, clock, secrets).Handle(
            new VerifyEmailCommand(Code, "session-1"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidVerificationToken);
        db.EmailVerifications.ShouldBeEmpty();
    }
}
