namespace Contracts.Auth;

// VerificationSecret comes from the registering browser's cookie, through the BFF. Empty when that cookie is absent.
public sealed record VerifyEmailRequest(string Code, string? VerificationSecret = null);
