using FluentValidation;

namespace Application.CardPayments.Create;

internal sealed class CreateCardPaymentCommandValidator : AbstractValidator<CreateCardPaymentCommand>
{
    public CreateCardPaymentCommandValidator()
    {
        RuleFor(c => c.FromAccountId).NotEmpty();
        RuleFor(c => c.CardAccountId).NotEmpty();
        RuleFor(c => c.Amount).GreaterThan(0);
    }
}
