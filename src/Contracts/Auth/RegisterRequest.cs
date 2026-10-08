namespace Contracts.Auth;

public sealed record RegisterRequest(string Email, string Password, string ConfirmPassword, string FirstName, string LastName);
