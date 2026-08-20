using Domain.Accounts;
using FluentValidation;

namespace Application.Accounts.Update;

internal sealed class UpdateAccountCommandValidator : AbstractValidator<UpdateAccountCommand>
{
    public UpdateAccountCommandValidator()
    {
        RuleFor(c => c.Name).NotEmpty().MaximumLength(100);
        RuleFor(c => c.Type).IsInEnum();
        RuleFor(c => c.Icon).Must(i => i is null || AccountStyle.ValidIcons.Contains(i))
            .WithMessage("Unsupported icon.");
        RuleFor(c => c.Color).Must(c => c is null || AccountStyle.ValidColors.Contains(c))
            .WithMessage("Unsupported color.");
    }
}
