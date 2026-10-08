namespace Contracts.Auth;

public sealed record ResetPasswordRequest(string Token, string NewPassword, string ConfirmPassword);
