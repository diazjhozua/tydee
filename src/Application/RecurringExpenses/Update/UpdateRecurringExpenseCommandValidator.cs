using FluentValidation;

namespace Application.RecurringExpenses.Update;

internal sealed class UpdateRecurringExpenseCommandValidator : AbstractValidator<UpdateRecurringExpenseCommand>
{
    public UpdateRecurringExpenseCommandValidator()
    {
        RuleFor(c => c.Name).NotEmpty().MaximumLength(100);
        RuleFor(c => c.AccountId).NotEmpty();
        RuleFor(c => c.Amount).GreaterThan(0);
        RuleFor(c => c.Note).MaximumLength(500);
        RuleFor(c => c.Category).MaximumLength(50);
    }
}