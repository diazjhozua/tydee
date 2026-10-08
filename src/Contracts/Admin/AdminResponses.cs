namespace Contracts.Admin;

public sealed record AdminUserResponse(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    bool IsEmailVerified,
    bool IsAdmin,
    bool IsLocked);

public sealed record UpdateUserRequest(bool? IsEmailVerified, bool? IsLocked);

public sealed record StatsResponse(
    int Users,
    int VerifiedUsers,
    int Accounts,
    int Expenses,
    int OpenSuggestions);