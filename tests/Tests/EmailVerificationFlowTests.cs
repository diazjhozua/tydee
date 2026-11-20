using Application.Users.Login;
using Application.Users.ProcessNextPendingEmail;
using Application.Users.Register;
using Application.Users.ResendVerification;
using Application.Users.VerifyEmail;
using Domain.Users;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using SharedKernel;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

// End-to-end through the handlers: the registration, resend, worker, verify, and login steps run in order.
public class EmailVerificationFlowTests
{
    private const string OwnerEmail = "owner@example.com";

    [Fact]
    public async Task Attacker_registration_never_goes_live_when_the_owner_verifies_from_their_own_browser()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emails = new FakeEmailSender();
        var hasher = new FakePasswordHasher();

        // The attacker registers the owner's address with a password of their own.
        var registered = await new RegisterUserCommandHandler(db, hasher, secrets, emails, clock).Handle(
            new RegisterUserCommand(OwnerEmail, "Attacker1!", "Attacker1!", "Mal", "Ory"), CancellationToken.None);
        string attackerSecret = registered.Value!.VerificationSecret;

        // The code goes to the owner's mailbox, not the attacker's browser.
        emails.VerificationRecipients.Single().ShouldBe(OwnerEmail);

        // The owner asks for a new code from their own browser, which has no cookie yet.
        clock.UtcNow = clock.UtcNow.AddSeconds(61);
        secrets.NextCode = "654321";

        var ownerResend = await new ResendVerificationCommandHandler(db, secrets, clock).Handle(
            new ResendVerificationCommand(OwnerEmail, null), CancellationToken.None);
        string ownerSecret = ownerResend.Value!.VerificationSecret;
        await ProcessNext(db, emails, clock, secrets);

        // The attacker's browser is no longer bound, so even the right code fails there.
        var fromAttacker = await VerifyFrom(db, clock, secrets, "654321", attackerSecret);
        fromAttacker.Error.ShouldBe(UserErrors.InvalidVerificationToken);

        // The owner verifies, and the attacker's password is dropped rather than activated.
        var fromOwner = await VerifyFrom(db, clock, secrets, "654321", ownerSecret);
        fromOwner.IsSuccess.ShouldBeTrue();
        fromOwner.Value!.HasPassword.ShouldBeFalse();

        var attackerLogin = await LoginWith(db, clock,"Attacker1!");
        attackerLogin.Error.ShouldBe(UserErrors.InvalidCredentials);
    }

    [Fact]
    public async Task Registrant_who_resends_from_the_same_browser_keeps_their_password_and_can_log_in()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var secrets = new FakeVerificationSecrets();
        var emails = new FakeEmailSender();
        var hasher = new FakePasswordHasher();

        var registered = await new RegisterUserCommandHandler(db, hasher, secrets, emails, clock).Handle(
            new RegisterUserCommand(OwnerEmail, "Owner123!", "Owner123!", "Ada", "Lovelace"), CancellationToken.None);
        string firstSecret = registered.Value!.VerificationSecret;

        clock.UtcNow = clock.UtcNow.AddSeconds(61);
        secrets.NextCode = "654321";

        var resent = await new ResendVerificationCommandHandler(db, secrets, clock).Handle(
            new ResendVerificationCommand(OwnerEmail, firstSecret), CancellationToken.None);
        string currentSecret = resent.Value!.VerificationSecret;
        await ProcessNext(db, emails, clock, secrets);

        var verified = await VerifyFrom(db, clock, secrets, "654321", currentSecret);
        verified.Value!.HasPassword.ShouldBeTrue();

        var login = await LoginWith(db, clock,"Owner123!");
        login.IsSuccess.ShouldBeTrue();
    }

    private static async Task<Result<VerifyEmailResult>> VerifyFrom(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        FakeVerificationSecrets secrets,
        string code,
        string browserSecret) =>
        await new VerifyEmailCommandHandler(db, secrets, clock).Handle(
            new VerifyEmailCommand(code, browserSecret), CancellationToken.None);

    private static Task<Result<AuthTokensResponse>> LoginWith(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider clock,
        string password) =>
        new LoginCommandHandler(
            db,
            new FakePasswordHasher(),
            new FakeTokenProvider(),
            new FakeAdminProvider(),
            clock)
            .Handle(new LoginCommand(OwnerEmail, password), CancellationToken.None);

    private static Task<Result<bool>> ProcessNext(
        Infrastructure.Database.ApplicationDbContext db,
        FakeEmailSender emails,
        FixedDateTimeProvider clock,
        FakeVerificationSecrets secrets) =>
        new ProcessNextPendingEmailCommandHandler(
            db,
            new FakeTokenProvider(),
            secrets,
            emails,
            clock,
            NullLogger<ProcessNextPendingEmailCommandHandler>.Instance)
            .Handle(new ProcessNextPendingEmailCommand(), CancellationToken.None);
}
