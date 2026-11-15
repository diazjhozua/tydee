using Application.CardPayments.Create;
using Shouldly;
using Xunit;

namespace Tests;

public class CreateCardPaymentCommandValidatorTests
{
    private readonly CreateCardPaymentCommandValidator _validator = new();

    [Fact]
    public void Rejects_a_zero_amount()
    {
        var result = _validator.Validate(new CreateCardPaymentCommand(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 0, new DateOnly(2026, 8, 6)));

        result.IsValid.ShouldBeFalse();
        result.Errors.ShouldContain(error => error.PropertyName == nameof(CreateCardPaymentCommand.Amount));
    }

    [Fact]
    public void Accepts_a_positive_amount()
    {
        var result = _validator.Validate(new CreateCardPaymentCommand(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 0.01m, new DateOnly(2026, 8, 6)));

        result.IsValid.ShouldBeTrue();
    }
}
