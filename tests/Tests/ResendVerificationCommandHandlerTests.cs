using Application.Users.ProcessNextPendingEmail;
using Application.Users.ResendVerification;
using Microsoft.Extensions.Logging.Abstractions;
using SharedKernel;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ResendVerificationCommandHandlerTests
{
    // Resend answers at once and queues the email. The worker sends it, so these tests run both steps.

    [Fact]
    public async Task Unknown_email_answers_success_and_sends_nothing()
    {
        using var db = TestDb.Create();
        var emailSender = new FakeEmailSender();
        var clock = new FixedDateTimeProvider();

        var result = await NewResendHandler(db, clock).Handle(
            new ResendVerificationCommand("nobody@example.com"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.PendingEmails.Count().ShouldBe(1);

        await ProcessNext(db, emailSender, clock);

        emailSender.VerificationEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task Already_verified_email_answers_success_and_sends_nothing()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: true);
        var emailSender = new FakeEmailSender();
        var clock = new FixedDateTimeProvider();

        var result = await NewResendHandler(db, clock).Handle(
            new ResendVerificationCommand(user.Email), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();

        await ProcessNext(db, emailSender, clock);

        emailSender.VerificationEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task Unverified_email_gets_a_fresh_token_and_a_new_email_when_the_worker_runs()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        user.EmailVerificationToken = "old-token";
        db.SaveChanges();

        var emailSender = new FakeEmailSender();
        var clock = new FixedDateTimeProvider();

        var result = await NewResendHandler(db, clock).Handle(
            new ResendVerificationCommand(user.Email), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        emailSender.VerificationEmailsSent.ShouldBe(0);

        await ProcessNext(db, emailSender, clock);

        emailSender.VerificationEmailsSent.ShouldBe(1);
        var saved = db.Users.Single();
        saved.EmailVerificationToken.ShouldNotBe("old-token");
        saved.EmailVerificationTokenExpiresAt.ShouldBe(clock.UtcNow.AddHours(24));
    }

    private static ResendVerificationCommandHandler NewResendHandler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock) =>
        new(db, clock);

    private static Task<Result<bool>> ProcessNext(
        Infrastructure.Database.ApplicationDbContext db,
        FakeEmailSender emailSender,
        FixedDateTimeProvider clock) =>
        new ProcessNextPendingEmailCommandHandler(
            db,
            new FakeTokenProvider(),
            emailSender,
            clock,
            NullLogger<ProcessNextPendingEmailCommandHandler>.Instance)
            .Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);
}
