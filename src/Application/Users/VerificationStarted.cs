namespace Application.Users;

/// <summary>
/// What a registration or resend hands back to the caller. <see cref="VerificationSecret"/> is the browser
/// secret: the BFF stores it in a cookie, and only that browser can spend the code.
/// </summary>
public sealed record VerificationStarted(string VerificationSecret);
