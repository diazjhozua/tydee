using FluentValidation;

namespace Application.Accounts.UpdateAllocationTemplate;

internal sealed class UpdateAllocationTemplateCommandValidator
    : AbstractValidator<UpdateAllocationTemplateCommand>
{
    public UpdateAllocationTemplateCommandValidator()
    {
        RuleFor(c => c.Items).NotEmpty();
        RuleForEach(c => c.Items).ChildRules(item =>
            item.RuleFor(i => i.Percent).InclusiveBetween(0, 100));
    }
}
