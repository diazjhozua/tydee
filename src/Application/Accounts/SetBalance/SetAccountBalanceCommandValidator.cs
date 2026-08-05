using FluentValidation;

namespace Application.Accounts.SetBalance;

internal sealed class SetAccountBalanceCommandValidator : AbstractValidator<SetAccountBalanceCommand>
{
    public SetAccountBalanceCommandValidator()
    {
        RuleFor(c => c.AccountId).NotEmpty();
        RuleFor(c => c.NewBalance).GreaterThanOrEqualTo(0);
    }
}
