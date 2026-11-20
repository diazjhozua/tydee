using Application.Users.ProcessNextPendingEmail;
using Domain.Users;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using SharedKernel;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ProcessNextPendingEmailCommandHandlerTests
{
    private static ProcessNextPendingEmailCommandHandler NewHandler(
        Infrastructure.Database.ApplicationDbContext db,
        FakeEmailSender emails,
        FixedDateTimeProvider clock) =>
        new(
            db,
            new FakeTokenProvider(),
            new FakeVerificationSecrets(),
            emails,
            clock,
            NullLogger<ProcessNextPendingEmailCommandHandler>.Instance);

    private static void Queue(
        Infrastructure.Database.ApplicationDbContext db,
        PendingEmailKind kind,
        string email,
        int attempts = 0)
    {
        var request = PendingEmail.Request(
            kind,
            email,
            new DateTime(2026, 8, 6, 11, 0, 0, DateTimeKind.Utc));

        request.Attempts = attempts;
        db.PendingEmails.Add(request);
        db.SaveChanges();
    }

    private static Task<Result<bool>> RunOnce(Infrastructure.Database.ApplicationDbContext db, FakeEmailSender emails, FixedDateTimeProvider clock) =>
        NewHandler(db, emails, clock).Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);

    [Fact]
    public async Task Empty_queue_returns_false_and_sends_nothing()
    {
        using var db = TestDb.Create();
        var emails = new FakeEmailSender();

        var result = await RunOnce(db, emails, new FixedDateTimeProvider());

        result.Value.ShouldBeFalse();
        emails.PasswordResetRecipients.ShouldBeEmpty();
        emails.VerificationRecipients.ShouldBeEmpty();
    }

    [Fact]
    public async Task Known_account_gets_one_reset_link_with_a_60_minute_token_and_the_request_is_removed()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");
        Queue(db, PendingEmailKind.PasswordReset, "known@example.com");

        var clock = new FixedDateTimeProvider();
        var emails = new FakeEmailSender();

        var result = await RunOnce(db, emails, clock);

        result.Value.ShouldBeTrue();
        emails.PasswordResetRecipients.Single().ShouldBe("known@example.com");
        db.Users.Single().PasswordResetTokenHash.ShouldBe("h:raw-1");
        db.Users.Single().PasswordResetTokenExpiresAt.ShouldBe(clock.UtcNow.AddMinutes(60));
        db.PendingEmails.Count().ShouldBe(0);
    }

    [Fact]
    public async Task Unknown_address_gets_no_reset_link_and_the_request_is_removed()
    {
        using var db = TestDb.Create();
        Queue(db, PendingEmailKind.PasswordReset, "nobody@example.com");
        var emails = new FakeEmailSender();

        var result = await RunOnce(db, emails, new FixedDateTimeProvider());

        result.Value.ShouldBeTrue();
        emails.PasswordResetRecipients.ShouldBeEmpty();
        db.PendingEmails.Count().ShouldBe(0);
    }

    [Fact]
    public async Task Locked_account_gets_no_reset_link_and_no_token()
    {
        using var db = TestDb.Create();
        Seed.User(db, "locked@example.com").IsLocked = true;
        db.SaveChanges();
        Queue(db, PendingEmailKind.PasswordReset, "locked@example.com");
        var emails = new FakeEmailSender();

        var result = await RunOnce(db, emails, new FixedDateTimeProvider());

        result.Value.ShouldBeTrue();
        emails.PasswordResetRecipients.ShouldBeEmpty();
        db.Users.Single().PasswordResetTokenHash.ShouldBeNull();
        db.PendingEmails.Count().ShouldBe(0);
    }

    [Fact]
    public async Task Failed_send_keeps_the_request_for_a_retry_after_a_backoff_and_stores_no_token()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");
        Queue(db, PendingEmailKind.PasswordReset, "known@example.com");
        var emails = new FakeEmailSender { FailPasswordResetSends = true };
        var clock = new FixedDateTimeProvider();

        var result = await RunOnce(db, emails, clock);

        result.Value.ShouldBeTrue();
        var request = db.PendingEmails.Single();
        request.Attempts.ShouldBe(1);
        request.NextAttemptOnUtc.ShouldBe(clock.UtcNow.AddSeconds(30));
        db.Users.Single().PasswordResetTokenHash.ShouldBeNull();
    }

    [Fact]
    public async Task Request_still_in_backoff_is_not_retried_in_the_same_tick()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");
        Queue(db, PendingEmailKind.PasswordReset, "known@example.com");
        var emails = new FakeEmailSender { FailPasswordResetSends = true };
        var clock = new FixedDateTimeProvider();
        var handler = NewHandler(db, emails, clock);

        await handler.Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);
        var second = await handler.Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);

        second.Value.ShouldBeFalse();
        db.PendingEmails.Single().Attempts.ShouldBe(1);
    }

    [Fact]
    public async Task Fifth_failed_send_drops_the_request()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");
        Queue(db, PendingEmailKind.PasswordReset, "known@example.com", attempts: 4);
        var emails = new FakeEmailSender { FailPasswordResetSends = true };

        await RunOnce(db, emails, new FixedDateTimeProvider());

        db.PendingEmails.Count().ShouldBe(0);
    }

    [Fact]
    public async Task Resend_for_an_unverified_account_emails_a_code_and_stores_only_its_hash()
    {
        using var db = TestDb.Create();
        User user = Seed.User(db, "unverified@example.com", verified: false);
        var clock = new FixedDateTimeProvider();
        var emails = new FakeEmailSender();
        var secrets = new FakeVerificationSecrets();

        db.PendingEmails.Add(PendingEmail.Request(
            PendingEmailKind.VerificationResend,
            "unverified@example.com",
            clock.UtcNow,
            sessionHash: "sh:new"));
        db.SaveChanges();

        await new ProcessNextPendingEmailCommandHandler(
            db,
            new FakeTokenProvider(),
            secrets,
            emails,
            clock,
            NullLogger<ProcessNextPendingEmailCommandHandler>.Instance)
            .Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);

        emails.VerificationRecipients.Single().ShouldBe("unverified@example.com");
        emails.VerificationCodes.Single().ShouldBe("123456");

        EmailVerification saved = db.EmailVerifications.Single();
        saved.UserId.ShouldBe(user.Id);
        saved.CodeHash.ShouldBe(secrets.HashCode(user.Id, "123456"));
        saved.SessionHash.ShouldBe("sh:new");
        db.PendingEmails.Count().ShouldBe(0);
    }

    [Fact]
    public async Task Resend_for_a_verified_or_unknown_address_sends_nothing_and_removes_the_request()
    {
        using var db = TestDb.Create();
        Seed.User(db, "verified@example.com", verified: true);
        Queue(db, PendingEmailKind.VerificationResend, "verified@example.com");
        Queue(db, PendingEmailKind.VerificationResend, "nobody@example.com");
        var emails = new FakeEmailSender();
        var handler = NewHandler(db, emails, new FixedDateTimeProvider());

        await handler.Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);
        await handler.Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);

        emails.VerificationRecipients.ShouldBeEmpty();
        db.PendingEmails.Count().ShouldBe(0);
    }
}
