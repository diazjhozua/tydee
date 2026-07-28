using FluentValidation;

namespace Application.Accounts.Create;

internal sealed class CreateAccountCommandValidator : AbstractValidator<CreateAccountCommand>
{
    public CreateAccountCommandValidator()
    {
        RuleFor(c => c.Name).NotEmpty().MaximumLength(100);
        RuleFor(c => c.Type).IsInEnum();
        RuleFor(c => c.AllocationPercent).InclusiveBetween(0, 100);
    }
}
