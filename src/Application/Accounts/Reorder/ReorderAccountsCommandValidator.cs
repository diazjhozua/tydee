using FluentValidation;

namespace Application.Accounts.Reorder;

internal sealed class ReorderAccountsCommandValidator : AbstractValidator<ReorderAccountsCommand>
{
    public ReorderAccountsCommandValidator()
    {
        RuleFor(c => c.AccountIds).NotEmpty();
    }
}
