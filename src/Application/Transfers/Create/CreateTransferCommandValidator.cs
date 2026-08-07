using FluentValidation;

namespace Application.Transfers.Create;

internal sealed class CreateTransferCommandValidator : AbstractValidator<CreateTransferCommand>
{
    public CreateTransferCommandValidator()
    {
        RuleFor(c => c.FromAccountId).NotEmpty();
        RuleFor(c => c.ToAccountId).NotEmpty();
        RuleFor(c => c.Amount).GreaterThan(0);
    }
}
