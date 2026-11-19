using Application.Users.ForgotPassword;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class ForgotPasswordCommandHandlerTests
{
    private static ForgotPasswordCommandHandler NewHandler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    [Fact]
    public async Task Known_and_unknown_emails_each_queue_one_request_and_touch_nothing_else()
    {
        using var db = TestDb.Create();
        Seed.User(db, "known@example.com");
        db.SaveChanges();

        var handler = NewHandler(db);

        var known = await handler.Handle(new ForgotPasswordCommand("Known@Example.com"), CancellationToken.None);
        var unknown = await handler.Handle(new ForgotPasswordCommand("unknown@example.com"), CancellationToken.None);

        known.IsSuccess.ShouldBeTrue();
        unknown.IsSuccess.ShouldBeTrue();
        db.PendingEmails.Count().ShouldBe(2);
        db.PendingEmails.Select(p => p.Email).ShouldContain("known@example.com");
        db.PendingEmails.Select(p => p.Email).ShouldContain("unknown@example.com");
        db.Users.Single().PasswordResetTokenHash.ShouldBeNull();
    }
}
