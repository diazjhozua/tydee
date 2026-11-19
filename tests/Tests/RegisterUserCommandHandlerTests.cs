using Application.Users.Register;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class RegisterUserCommandHandlerTests
{
    private static RegisterUserCommand Command(string email) =>
        new(email, "Password123!", "Password123!", "Ada", "Lovelace");

    [Fact]
    public async Task New_email_creates_the_account_and_sends_a_verification_link()
    {
        using var db = TestDb.Create();
        var hasher = new FakePasswordHasher();
        var emails = new FakeEmailSender();

        var result = await NewHandler(db, hasher, emails).Handle(
            Command("new@example.com"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Users.Single().Email.ShouldBe("new@example.com");
        emails.VerificationEmailsSent.ShouldBe(1);
        emails.AlreadyRegisteredEmailsSent.ShouldBe(0);
        hasher.HashCalls.ShouldBe(1);
    }

    [Fact]
    public async Task Existing_email_succeeds_without_creating_a_user_and_sends_a_notice()
    {
        using var db = TestDb.Create();
        Seed.User(db, "taken@example.com");
        db.SaveChanges();

        var hasher = new FakePasswordHasher();
        var emails = new FakeEmailSender();

        var result = await NewHandler(db, hasher, emails).Handle(
            Command("taken@example.com"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Users.Count().ShouldBe(1);
        emails.VerificationEmailsSent.ShouldBe(0);
        emails.AlreadyRegisteredEmailsSent.ShouldBe(1);
        hasher.HashCalls.ShouldBe(1);
    }

    [Fact]
    public async Task New_and_existing_emails_return_the_same_success()
    {
        using var db = TestDb.Create();
        Seed.User(db, "taken@example.com");
        db.SaveChanges();

        var handler = NewHandler(db, new FakePasswordHasher(), new FakeEmailSender());

        var existing = await handler.Handle(Command("taken@example.com"), CancellationToken.None);
        var fresh = await handler.Handle(Command("fresh@example.com"), CancellationToken.None);

        existing.IsSuccess.ShouldBeTrue();
        fresh.IsSuccess.ShouldBeTrue();
        existing.Error.ShouldBe(fresh.Error);
    }

    private static RegisterUserCommandHandler NewHandler(
        Infrastructure.Database.ApplicationDbContext db,
        FakePasswordHasher hasher,
        FakeEmailSender emails) =>
        new(db, hasher, emails, new FixedDateTimeProvider());
}
