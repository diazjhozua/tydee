using System.Linq;
using Application.Users.Register;
using Shouldly;
using Xunit;

namespace Tests;

public class RegisterUserCommandValidatorTests
{
    private static readonly RegisterUserCommandValidator Validator = new();

    [Fact]
    public void Address_of_256_characters_passes()
    {
        Validator.Validate(Command(Address(256))).IsValid.ShouldBeTrue();
    }

    [Fact]
    public void Address_of_257_characters_fails_on_length_alone()
    {
        var result = Validator.Validate(Command(Address(257)));

        result.Errors.Where(e => e.PropertyName == "Email").Select(e => e.ErrorCode)
            .Single().ShouldBe("MaximumLengthValidator");
    }

    [Fact]
    public void Malformed_address_is_still_rejected()
    {
        var result = Validator.Validate(Command("not-an-email"));

        result.Errors.Where(e => e.PropertyName == "Email").Select(e => e.ErrorCode)
            .Single().ShouldBe("EmailValidator");
    }

    [Fact]
    public void Empty_address_is_rejected_as_empty()
    {
        var result = Validator.Validate(Command(string.Empty));

        result.Errors.Where(e => e.PropertyName == "Email").Select(e => e.ErrorCode)
            .Single().ShouldBe("NotEmptyValidator");
    }

    private static RegisterUserCommand Command(string email) =>
        new(email, "password123", "password123", "Ada", "Lovelace");

    private static string Address(int length) => new string('a', length - "@example.com".Length) + "@example.com";
}
