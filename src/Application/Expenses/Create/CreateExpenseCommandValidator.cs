using FluentValidation;

namespace Application.Expenses.Create;

internal sealed class CreateExpenseCommandValidator : AbstractValidator<CreateExpenseCommand>
{
    public CreateExpenseCommandValidator()
    {
        RuleFor(c => c.AccountId).NotEmpty();
        RuleFor(c => c.Amount).GreaterThan(0);
        RuleFor(c => c.Note).MaximumLength(500);
        RuleFor(c => c.Category).MaximumLength(50);
    }
}
