using Application.Abstractions.Data;
using Application.Users.Login;
using Domain.Users;
using NSubstitute;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class LoginCommandHandlerTests
{
    private static LoginCommandHandler Handler(
        Infrastructure.Database.ApplicationDbContext db,
        FixedDateTimeProvider? clock = null,
        FakeAdminProvider? adminProvider = null) =>
        new(
            db,
            new FakePasswordHasher(),
            new FakeTokenProvider(),
            adminProvider ?? new FakeAdminProvider(),
            clock ?? new FixedDateTimeProvider());

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
    public async Task Unknown_and_locked_accounts_pay_one_hash_and_no_verify()
    {
        using var db = TestDb.Create();
        Seed.User(db, "locked@example.com").IsLocked = true;
        db.SaveChanges();

        var unknownHasher = new FakePasswordHasher();
        await NewHandler(db, unknownHasher).Handle(
            new LoginCommand("unknown@example.com", "Password123!"), CancellationToken.None);

        var lockedHasher = new FakePasswordHasher();
        await NewHandler(db, lockedHasher).Handle(
            new LoginCommand("locked@example.com", "Password123!"), CancellationToken.None);

        unknownHasher.HashCalls.ShouldBe(1);
        unknownHasher.VerifyCalls.ShouldBe(0);
        lockedHasher.HashCalls.ShouldBe(1);
        lockedHasher.VerifyCalls.ShouldBe(0);
    }

    [Fact]
    public async Task Wrong_password_verifies_once_and_does_not_hash()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");

        var hasher = new FakePasswordHasher();
        await NewHandler(db, hasher).Handle(
            new LoginCommand("known@example.com", "WrongPassword"), CancellationToken.None);

        hasher.VerifyCalls.ShouldBe(1);
        hasher.HashCalls.ShouldBe(0);
    }

    private static LoginCommandHandler NewHandler(
        Infrastructure.Database.ApplicationDbContext db,
        FakePasswordHasher hasher) =>
        new(
            db,
            hasher,
            new FakeTokenProvider(),
            new FakeAdminProvider(),
            new FixedDateTimeProvider());

    [Fact]
    public async Task Repeated_wrong_passwords_never_lock_the_account()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var handler = Handler(db);

        for (int i = 0; i < 10; i++)
        {
            var wrong = await handler.Handle(new LoginCommand(user.Email, "WrongPassword"), CancellationToken.None);
            wrong.Error.ShouldBe(UserErrors.InvalidCredentials);
        }

        var result = await handler.Handle(new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Wrong_password_issues_no_refresh_token()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        await Handler(db).Handle(new LoginCommand(user.Email, "WrongPassword"), CancellationToken.None);

        db.RefreshTokens.ShouldBeEmpty();
    }

    [Fact]
    public async Task Admin_locked_user_is_rejected_even_with_the_correct_password()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        user.IsLocked = true;
        db.SaveChanges();

        var result = await Handler(db).Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.Error.ShouldBe(UserErrors.InvalidCredentials);
        db.RefreshTokens.ShouldBeEmpty();
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

    [Fact]
    public async Task Login_takes_the_row_lock_before_it_reads_the_user()
    {
        // The in-memory provider has no transactions, so the lock order is checked with a
        // substitute context that records when the lock and the user read happen.
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var events = new List<string>();

        IApplicationDbContext context = Substitute.For<IApplicationDbContext>();
        context.Users.Returns(_ =>
        {
            events.Add("read");
            return db.Users;
        });
        context.RefreshTokens.Returns(db.RefreshTokens);
        context.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(call => db.SaveChangesAsync(call.Arg<CancellationToken>()));
        context.LockUserByEmailAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                events.Add("lock");
                return Substitute.For<IUserLock>();
            });

        var handler = new LoginCommandHandler(
            context,
            new FakePasswordHasher(),
            new FakeTokenProvider(),
            new FakeAdminProvider(),
            new FixedDateTimeProvider());

        var result = await handler.Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        events.ShouldBe(["lock", "read"]);
    }

    [Fact]
    public async Task Allowlisted_email_is_granted_admin_on_login()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db, "admin@example.com");
        user.IsAdmin.ShouldBeFalse();

        var result = await Handler(db, adminProvider: new FakeAdminProvider("Admin@Example.com")).Handle(
            new LoginCommand(user.Email, "Password123!"), CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        db.Users.Single().IsAdmin.ShouldBeTrue();
    }
}
