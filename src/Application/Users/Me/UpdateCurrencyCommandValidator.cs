using FluentValidation;

namespace Application.Users.Me;

internal sealed class UpdateCurrencyCommandValidator : AbstractValidator<UpdateCurrencyCommand>
{
    private static readonly string[] SupportedCurrencies =
        ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"];

    public UpdateCurrencyCommandValidator()
    {
        RuleFor(c => c.Currency)
            .NotEmpty()
            .Must(c => SupportedCurrencies.Contains(c.ToUpperInvariant()))
            .WithMessage("Currency must be one of: " + string.Join(", ", SupportedCurrencies));
    }
}
