using Application.Users.Register;
using Domain.Users;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class RegisterUserCommandHandlerTests
{
    private static RegisterUserCommand Command(string email) =>
        new(email, "Password123!", "Password123!", "Ada", "Lovelace");

    [Fact]
    public async Task New_email_creates_an_unverified_account_with_a_hashed_code_and_emails_the_code()
    {
        using var db = TestDb.Create();
        var hasher = new FakePasswordHasher();
        var emails = new FakeEmailSender();
        var secrets = new FakeVerificationSecrets();

        var result = await NewHandler(db, hasher, secrets, emails).Handle(
            Command("new@example.com"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        User user = db.Users.Single();
        user.Email.ShouldBe("new@example.com");
        user.IsEmailVerified.ShouldBeFalse();

        // The account's own hash waits empty; the registration password lives in the verification row.
        user.PasswordHash.ShouldBe(string.Empty);

        EmailVerification verification = db.EmailVerifications.Single();
        verification.UserId.ShouldBe(user.Id);
        verification.PendingPasswordHash.ShouldBe("#Password123!");
        verification.CodeHash.ShouldBe(secrets.HashCode(user.Id, "123456"));
        verification.SessionHash.ShouldBe(secrets.HashSessionSecret(result.Value!.VerificationSecret));

        emails.VerificationEmailsSent.ShouldBe(1);
        emails.VerificationCodes.Single().ShouldBe("123456");
        emails.AlreadyRegisteredEmailsSent.ShouldBe(0);
    }

    [Fact]
    public async Task New_email_stores_no_code_in_clear()
    {
        using var db = TestDb.Create();
        var emails = new FakeEmailSender();

        await NewHandler(db, new FakePasswordHasher(), new FakeVerificationSecrets(), emails).Handle(
            Command("clear@example.com"), CancellationToken.None);

        db.EmailVerifications.Single().CodeHash.ShouldNotBe(emails.VerificationCodes.Single());
    }

    [Fact]
    public async Task Failed_code_send_commits_nothing_so_no_row_is_left_bound_to_an_unseen_secret()
    {
        using var db = TestDb.Create();
        var emails = new FakeEmailSender { FailVerificationSends = true };

        await Should.ThrowAsync<InvalidOperationException>(() => NewHandler(
            db,
            new FakePasswordHasher(),
            new FakeVerificationSecrets(),
            emails).Handle(Command("unsent@example.com"), CancellationToken.None));

        db.Users.ShouldBeEmpty();
        db.EmailVerifications.ShouldBeEmpty();
    }

    [Fact]
    public async Task Existing_email_succeeds_without_creating_a_user_and_sends_a_notice()
    {
        using var db = TestDb.Create();
        Seed.User(db, "taken@example.com");

        var hasher = new FakePasswordHasher();
        var emails = new FakeEmailSender();

        var result = await NewHandler(db, hasher, new FakeVerificationSecrets(), emails).Handle(
            Command("taken@example.com"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Users.Count().ShouldBe(1);
        db.EmailVerifications.ShouldBeEmpty();
        emails.VerificationEmailsSent.ShouldBe(0);
        emails.AlreadyRegisteredEmailsSent.ShouldBe(1);
        hasher.HashCalls.ShouldBe(1);
    }

    [Fact]
    public async Task New_and_existing_emails_return_the_same_shape_of_success()
    {
        using var db = TestDb.Create();
        Seed.User(db, "taken@example.com");

        var handler = NewHandler(db, new FakePasswordHasher(), new FakeVerificationSecrets(), new FakeEmailSender());

        var existing = await handler.Handle(Command("taken@example.com"), CancellationToken.None);
        var fresh = await handler.Handle(Command("fresh@example.com"), CancellationToken.None);

        existing.IsSuccess.ShouldBeTrue();
        fresh.IsSuccess.ShouldBeTrue();
        existing.Value!.VerificationSecret.ShouldNotBeNullOrEmpty();
        fresh.Value!.VerificationSecret.ShouldNotBeNullOrEmpty();
        existing.Error.ShouldBe(fresh.Error);
    }

    private static RegisterUserCommandHandler NewHandler(
        Infrastructure.Database.ApplicationDbContext db,
        FakePasswordHasher hasher,
        FakeVerificationSecrets secrets,
        FakeEmailSender emails) =>
        new(db, hasher, secrets, emails, new FixedDateTimeProvider());
}
