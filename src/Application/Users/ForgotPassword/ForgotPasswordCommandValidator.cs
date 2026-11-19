using FluentValidation;

namespace Application.Users.ForgotPassword;

internal sealed class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        // Matches the column length. A longer address would fail the insert and answer 500 instead of the uniform 200.
        RuleFor(c => c.Email).NotEmpty().EmailAddress().MaximumLength(256);
    }
}
