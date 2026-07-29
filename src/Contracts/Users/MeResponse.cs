namespace Contracts.Users;

public sealed record MeResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string Currency);
