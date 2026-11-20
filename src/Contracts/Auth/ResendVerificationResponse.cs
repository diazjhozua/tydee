namespace Contracts.Auth;

// VerificationSecret replaces the browser's secret. The BFF stores it in the cookie and never sends it to the page.
public sealed record ResendVerificationResponse(string Message, string VerificationSecret);
