using FluentValidation;

namespace Application.Users.ResetPassword;

internal sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(c => c.Token).NotEmpty();
        RuleFor(c => c.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(128);
        RuleFor(c => c.ConfirmPassword)
            .Equal(c => c.NewPassword)
            .WithMessage("Passwords do not match.");
    }
}
