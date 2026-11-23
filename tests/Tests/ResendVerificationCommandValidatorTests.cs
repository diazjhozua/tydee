using System.Linq;
using Application.Users.ResendVerification;
using Shouldly;
using Xunit;

namespace Tests;

public class ResendVerificationCommandValidatorTests
{
    private static readonly ResendVerificationCommandValidator Validator = new();

    [Fact]
    public void Address_of_256_characters_passes()
    {
        Validator.Validate(new ResendVerificationCommand(Address(256), null)).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Address_of_257_characters_fails_on_length_alone()
    {
        var result = Validator.Validate(new ResendVerificationCommand(Address(257), null));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("MaximumLengthValidator");
    }

    [Fact]
    public void Malformed_address_is_still_rejected()
    {
        var result = Validator.Validate(new ResendVerificationCommand("not-an-email", null));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("EmailValidator");
    }

    [Fact]
    public void Empty_address_is_rejected_as_empty()
    {
        var result = Validator.Validate(new ResendVerificationCommand(string.Empty, null));

        result.Errors.Select(e => e.ErrorCode).Single().ShouldBe("NotEmptyValidator");
    }

    private static string Address(int length) => new string('a', length - "@example.com".Length) + "@example.com";
}
