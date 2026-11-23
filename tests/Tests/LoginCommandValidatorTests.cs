using System.Linq;
using Application.Users.Login;
using Shouldly;
using Xunit;

namespace Tests;

public class LoginCommandValidatorTests
{
    private static readonly LoginCommandValidator Validator = new();

    [Fact]
    public void Address_of_256_characters_passes()
    {
        Validator.Validate(new LoginCommand(Address(256), "password")).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Address_of_257_characters_fails_on_length_alone()
    {
        var result = Validator.Validate(new LoginCommand(Address(257), "password"));

        result.Errors.Where(e => e.PropertyName == "Email").Select(e => e.ErrorCode)
            .Single().ShouldBe("MaximumLengthValidator");
    }

    [Fact]
    public void Oversize_malformed_address_reports_only_the_length_error()
    {
        var result = Validator.Validate(new LoginCommand(new string('a', 300), "password"));

        result.Errors.Where(e => e.PropertyName == "Email").Select(e => e.ErrorCode)
            .Single().ShouldBe("MaximumLengthValidator");
    }

    [Fact]
    public void Malformed_address_is_still_rejected()
    {
        var result = Validator.Validate(new LoginCommand("not-an-email", "password"));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("EmailValidator");
    }

    [Fact]
    public void Empty_address_is_rejected_as_empty()
    {
        var result = Validator.Validate(new LoginCommand(string.Empty, "password"));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("NotEmptyValidator");
    }

    [Fact]
    public void Password_of_128_characters_passes()
    {
        Validator.Validate(new LoginCommand("user@example.com", new string('p', 128))).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Password_of_129_characters_fails()
    {
        var result = Validator.Validate(new LoginCommand("user@example.com", new string('p', 129)));

        result.Errors.Where(e => e.PropertyName == "Password").Select(e => e.ErrorCode)
            .Single().ShouldBe("MaximumLengthValidator");
    }

    private static string Address(int length) => new string('a', length - "@example.com".Length) + "@example.com";
}
