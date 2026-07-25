using SharedKernel;

namespace Domain.Users;

public static class UserErrors
{
    public static readonly Error EmailNotUnique = Error.Conflict(
        "Users.EmailNotUnique",
        "The provided email is already in use.");

    public static readonly Error InvalidCredentials = Error.Unauthorized(
        "Users.InvalidCredentials",
        "Invalid email or password.");

    public static readonly Error EmailNotVerified = Error.Forbidden(
        "Users.EmailNotVerified",
        "Please verify your email before logging in.");

    public static readonly Error InvalidVerificationToken = Error.NotFound(
        "Users.InvalidVerificationToken",
        "The verification token is invalid or has expired.");

    public static readonly Error EmailAlreadyVerified = Error.Conflict(
        "Users.EmailAlreadyVerified",
        "This email address has already been verified.");

    public static readonly Error InvalidRefreshToken = Error.Unauthorized(
        "Users.InvalidRefreshToken",
        "The refresh token is invalid or has expired.");

    public static readonly Error TokenReuseDetected = Error.Unauthorized(
        "Users.TokenReuseDetected",
        "Suspicious activity detected. All sessions have been revoked.");
}
