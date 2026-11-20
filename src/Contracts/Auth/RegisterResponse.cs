namespace Contracts.Auth;

// VerificationSecret is the browser secret. The BFF moves it into an httpOnly cookie and never sends it to the page.
public sealed record RegisterResponse(string Message, string VerificationSecret);
