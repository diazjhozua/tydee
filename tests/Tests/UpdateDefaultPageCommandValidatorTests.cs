using Application.Users.Me;
using Domain.Users;
using Shouldly;
using Xunit;

namespace Tests;

public class UpdateDefaultPageCommandValidatorTests
{
    private readonly UpdateDefaultPageCommandValidator _validator = new();

    [Theory]
    [InlineData(DefaultPages.Home)]
    [InlineData(DefaultPages.LogExpense)]
    [InlineData("home")]
    public void Accepts_supported_pages(string value)
    {
        var result = _validator.Validate(new UpdateDefaultPageCommand(Guid.NewGuid(), value));

        result.IsValid.ShouldBeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("Dashboard")]
    public void Rejects_unsupported_pages(string value)
    {
        var result = _validator.Validate(new UpdateDefaultPageCommand(Guid.NewGuid(), value));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(error => error.ErrorMessage == "Default page must be Home or LogExpense.");
    }
}
