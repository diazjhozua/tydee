using Application.Users.VerifyEmail;
using Shouldly;
using Xunit;

namespace Tests;

public class VerifyEmailCommandValidatorTests
{
    private static readonly VerifyEmailCommandValidator Validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("12345")]
    [InlineData("1234567")]
    [InlineData("12a456")]
    [InlineData(" 123456")]
    public void Codes_that_are_not_exactly_six_digits_are_rejected(string code)
    {
        Validator.Validate(new VerifyEmailCommand(code, "session")).IsValid.ShouldBeFalse();
    }

    [Fact]
    public void Six_digit_code_passes()
    {
        Validator.Validate(new VerifyEmailCommand("004217", "session")).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Empty_browser_secret_passes_so_the_handler_can_answer_with_the_usual_error()
    {
        Validator.Validate(new VerifyEmailCommand("123456", string.Empty)).IsValid.ShouldBeTrue();
    }
}
