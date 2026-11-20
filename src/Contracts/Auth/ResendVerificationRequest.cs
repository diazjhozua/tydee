namespace Contracts.Auth;

// PresentedVerificationSecret is the browser's current secret, or null when it has none.
public sealed record ResendVerificationRequest(string Email, string? PresentedVerificationSecret = null);
