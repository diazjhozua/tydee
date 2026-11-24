using System.Linq;
using Application.Users.ForgotPassword;
using Shouldly;
using Xunit;

namespace Tests;

public class ForgotPasswordCommandValidatorTests
{
    private static readonly ForgotPasswordCommandValidator Validator = new();

    [Fact]
    public void Address_of_256_characters_passes()
    {
        Validator.Validate(new ForgotPasswordCommand(Address(256))).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Address_of_257_characters_fails_on_length_alone()
    {
        var result = Validator.Validate(new ForgotPasswordCommand(Address(257)));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("MaximumLengthValidator");
    }

    [Fact]
    public void Oversize_malformed_address_reports_only_the_length_error()
    {
        var result = Validator.Validate(new ForgotPasswordCommand(new string('a', 300)));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("MaximumLengthValidator");
    }

    [Fact]
    public void Malformed_address_is_still_rejected()
    {
        var result = Validator.Validate(new ForgotPasswordCommand("not-an-email"));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("EmailValidator");
    }

    [Fact]
    public void Empty_address_is_rejected_as_empty()
    {
        var result = Validator.Validate(new ForgotPasswordCommand(string.Empty));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("NotEmptyValidator");
    }

    private static string Address(int length) => new string('a', length - "@example.com".Length) + "@example.com";
}
