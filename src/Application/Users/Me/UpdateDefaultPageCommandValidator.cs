using Domain.Users;
using FluentValidation;

namespace Application.Users.Me;

internal sealed class UpdateDefaultPageCommandValidator : AbstractValidator<UpdateDefaultPageCommand>
{
    public UpdateDefaultPageCommandValidator()
    {
        RuleFor(c => c.DefaultPage)
            .NotEmpty()
            .Must(DefaultPages.IsValid)
            .WithMessage("Default page must be Home or LogExpense.");
    }
}
