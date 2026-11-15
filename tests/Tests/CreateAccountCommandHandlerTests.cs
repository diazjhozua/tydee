using Application.Accounts.Create;
using Domain.Accounts;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class CreateAccountCommandHandlerTests
{
    private static CreateAccountCommandHandler Handler(Infrastructure.Database.ApplicationDbContext db) =>
        new(db, new FixedDateTimeProvider());

    [Fact]
    public async Task Credit_card_with_a_nonzero_percent_is_rejected()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        var result = await Handler(db).Handle(
            new CreateAccountCommand(user.Id, "Visa", "CreditCard", 10, null, null),
            CancellationToken.None);

        result.Error.ShouldBe(AllocationErrors.CreditCardNotAllocatable);
        db.Accounts.ShouldBeEmpty();
    }

    [Fact]
    public async Task Credit_card_at_zero_percent_is_created()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);

        var result = await Handler(db).Handle(
            new CreateAccountCommand(user.Id, "Visa", "CreditCard", 0, "credit-card", "rose"),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        Account created = db.Accounts.Single();
        created.Id.ShouldBe(result.Value);
        created.Type.ShouldBe(AccountType.CreditCard);
    }
}
