using Application.Users.ResendVerification;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ResendVerificationCommandHandlerTests
{
    [Fact]
    public async Task Unknown_email_answers_success_without_sending_anything()
    {
        using var db = TestDb.Create();
        var emailSender = new FakeEmailSender();
        var handler = new ResendVerificationCommandHandler(db, emailSender, new FixedDateTimeProvider());

        var result = await handler.Handle(
            new ResendVerificationCommand("nobody@example.com"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        emailSender.VerificationEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task Already_verified_email_answers_success_without_sending_anything()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: true);
        var emailSender = new FakeEmailSender();
        var handler = new ResendVerificationCommandHandler(db, emailSender, new FixedDateTimeProvider());

        var result = await handler.Handle(
            new ResendVerificationCommand(user.Email), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        emailSender.VerificationEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task Unverified_email_gets_a_fresh_token_and_a_new_email()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, verified: false);
        user.EmailVerificationToken = "old-token";
        db.SaveChanges();

        var emailSender = new FakeEmailSender();
        var clock = new FixedDateTimeProvider();
        var handler = new ResendVerificationCommandHandler(db, emailSender, clock);

        var result = await handler.Handle(
            new ResendVerificationCommand(user.Email), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        emailSender.VerificationEmailsSent.ShouldBe(1);
        var saved = db.Users.Single();
        saved.EmailVerificationToken.ShouldNotBe("old-token");
        saved.EmailVerificationTokenExpiresAt.ShouldBe(clock.UtcNow.AddHours(24));
    }
}
