using Application.Accounts;
using Domain.Accounts;
using Shouldly;
using Xunit;

namespace Tests;

public class AccountTypeParserTests
{
    [Theory]
    [InlineData("Spending", AccountType.Spending)]
    [InlineData("Saving", AccountType.Saving)]
    [InlineData("CreditCard", AccountType.CreditCard)]
    [InlineData("creditcard", AccountType.CreditCard)]
    public void Accepts_every_supported_type(string value, AccountType expected)
    {
        var result = AccountTypeParser.Parse(value);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldBe(expected);
    }

    [Fact]
    public void Rejects_an_unknown_type_with_the_stable_code()
    {
        var result = AccountTypeParser.Parse("Checking");

        result.IsFailure.ShouldBeTrue();
        result.Error.Code.ShouldBe("Accounts.InvalidType");
    }
}
