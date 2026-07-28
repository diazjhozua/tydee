using FluentValidation;

namespace Application.Incomes.Create;

internal sealed class CreateIncomeCommandValidator : AbstractValidator<CreateIncomeCommand>
{
    public CreateIncomeCommandValidator()
    {
        RuleFor(c => c.Amount).GreaterThan(0);
        RuleFor(c => c.Source).NotEmpty().MaximumLength(200);
        RuleFor(c => c.Allocations).NotEmpty();
        RuleForEach(c => c.Allocations).ChildRules(item =>
            item.RuleFor(a => a.Amount).GreaterThan(0));
    }
}
