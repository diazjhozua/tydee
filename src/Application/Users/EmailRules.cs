using FluentValidation;

namespace Application.Users;

public static class EmailRules
{
    // Matches the varchar(256) columns on users.email and pending_emails.email.
    public const int MaxLength = 256;

    // Length is checked before the format rule, and the chain stops at the first failure, so the format check
    // never sees an oversize address.
    public static IRuleBuilderOptions<T, string> ValidEmailAddress<T>(this IRuleBuilderInitial<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop).NotEmpty().MaximumLength(MaxLength).EmailAddress();

    public static bool IsWithinMaxLength(string? email) => email is null || email.Length <= MaxLength;
}
