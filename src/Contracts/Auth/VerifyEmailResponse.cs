namespace Contracts.Auth;

// False when the registration password was dropped. The owner then sets a password through Forgot password.
public sealed record VerifyEmailResponse(bool HasPassword);
