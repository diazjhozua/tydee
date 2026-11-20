namespace Application.Users.VerifyEmail;

/// <summary>
/// <see cref="HasPassword"/> is false when the registration password was dropped, for example after the
/// address was verified from a browser other than the one that registered. The owner then sets a password
/// through Forgot password.
/// </summary>
public sealed record VerifyEmailResult(bool HasPassword);
