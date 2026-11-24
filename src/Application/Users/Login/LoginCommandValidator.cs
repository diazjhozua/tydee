using FluentValidation;

namespace Application.Users.Login;

internal sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(c => c.Email).ValidEmailAddress();
        RuleFor(c => c.Password).NotEmpty().MaximumLength(128);
    }
}
