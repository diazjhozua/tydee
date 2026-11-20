using FluentValidation;

namespace Application.Users.VerifyEmail;

internal sealed class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(c => c.Code)
            .NotEmpty()
            .Matches("^[0-9]{6}$")
            .WithMessage("The code must be 6 digits.");

        // VerificationSecret may be empty: a request without the registering browser's cookie fails in the handler,
        // with the same answer as a wrong code.
    }
}
