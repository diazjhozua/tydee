using Application.Users.ProcessNextPendingEmail;
using Application.Users.ResendVerification;
using Domain.Users;
using Microsoft.Extensions.Logging.Abstractions;
using SharedKernel;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ResendVerificationCommandHandlerTests
{
    // Resend answers at once and queues the work. The worker issues the code, so these tests run both steps.

    [Fact]
    public async Task Unknown_email_answers_success_and_sends_nothing()
    {
        using var db = TestDb.Create();
        var emailSender = new FakeEmailSender();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();

        var result = await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand("nobody@example.com", null), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.PendingEmails.Count().ShouldBe(1);

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task Already_verified_email_answers_success_and_sends_nothing()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: true);
        var emailSender = new FakeEmailSender();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();

        var result = await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand(user.Email, null), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task Unverified_account_gets_a_code_bound_to_the_secret_it_returns()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emailSender = new FakeEmailSender();

        var result = await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand(user.Email, null), CancellationToken.None);

        emailSender.VerificationEmailsSent.ShouldBe(0);

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationCodes.Single().ShouldBe("123456");

        EmailVerification saved = db.EmailVerifications.Single();
        saved.CodeHash.ShouldBe(secrets.HashCode(user.Id, "123456"));
        saved.SessionHash.ShouldBe(secrets.HashSessionSecret(result.Value!.VerificationSecret));
        saved.LastIssuedOnUtc.ShouldBe(clock.UtcNow);
        saved.CodeExpiresOnUtc.ShouldBe(clock.UtcNow.AddMinutes(15));
    }

    [Fact]
    public async Task Resend_without_the_bound_secret_drops_the_registration_password()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emailSender = new FakeEmailSender();

        Seed.Verification(
            db,
            user,
            sessionHash: "sh:old",
            pendingPasswordHash: "#Password123!",
            lastIssuedOn: clock.UtcNow.AddMinutes(-2));

        await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand(user.Email, null), CancellationToken.None);

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationEmailsSent.ShouldBe(1);
        db.EmailVerifications.Single().PendingPasswordHash.ShouldBeNull();
    }

    [Fact]
    public async Task Resend_presenting_the_bound_secret_keeps_the_registration_password()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emailSender = new FakeEmailSender();

        Seed.Verification(
            db,
            user,
            sessionHash: "sh:old",
            pendingPasswordHash: "#Password123!",
            lastIssuedOn: clock.UtcNow.AddMinutes(-2));

        await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand(user.Email, "old"), CancellationToken.None);

        await ProcessNext(db, emailSender, clock, secrets);

        db.EmailVerifications.Single().PendingPasswordHash.ShouldBe("#Password123!");
    }

    [Fact]
    public async Task Resend_inside_the_cooldown_rebinds_the_browser_but_sends_no_new_code()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emailSender = new FakeEmailSender();

        string codeHash = secrets.HashCode(user.Id, "123456");

        Seed.Verification(
            db,
            user,
            sessionHash: "sh:old",
            codeHash: codeHash,
            codeExpiresOn: clock.UtcNow.AddMinutes(10),
            lastIssuedOn: clock.UtcNow.AddSeconds(-10),
            pendingPasswordHash: "#Password123!");

        var result = await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand(user.Email, "old"), CancellationToken.None);

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationEmailsSent.ShouldBe(0);

        EmailVerification saved = db.EmailVerifications.Single();
        saved.CodeHash.ShouldBe(codeHash);
        saved.SessionHash.ShouldBe(secrets.HashSessionSecret(result.Value!.VerificationSecret));
        saved.PendingPasswordHash.ShouldBe("#Password123!");
    }

    [Fact]
    public async Task Spent_account_gets_no_code_and_keeps_its_binding()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emailSender = new FakeEmailSender();

        Seed.Verification(
            db,
            user,
            sessionHash: "sh:old",
            attempts: EmailVerification.MaxAttempts,
            lastIssuedOn: clock.UtcNow.AddHours(-1));

        await NewResendHandler(db, clock, secrets).Handle(
            new ResendVerificationCommand(user.Email, null), CancellationToken.None);

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationEmailsSent.ShouldBe(0);
        db.EmailVerifications.Single().SessionHash.ShouldBe("sh:old");
    }

    [Fact]
    public async Task Request_queued_without_a_session_hash_is_dropped_by_the_worker()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emailSender = new FakeEmailSender();

        db.PendingEmails.Add(PendingEmail.Request(PendingEmailKind.VerificationResend, user.Email, clock.UtcNow));
        db.SaveChanges();

        await ProcessNext(db, emailSender, clock, secrets);

        emailSender.VerificationEmailsSent.ShouldBe(0);
        db.PendingEmails.Count().ShouldBe(0);
    }

    private static ResendVerificationCommandHandler NewResendHandler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        FakeVerificationSecrets secrets) =>
        new(db, secrets, clock);

    private static Task<Result<bool>> ProcessNext(
        Infrastructure.Database.ApplicationDbContext db,
        FakeEmailSender emailSender,
        FixedDateTimeProvider clock,
        FakeVerificationSecrets secrets) =>
        new ProcessNextPendingEmailCommandHandler(
            db,
            new FakeTokenProvider(),
            secrets,
            emailSender,
            clock,
            NullLogger<ProcessNextPendingEmailCommandHandler>.Instance)
            .Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);
}
