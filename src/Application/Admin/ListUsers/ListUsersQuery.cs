using Application.Abstractions.Messaging;

namespace Application.Admin.ListUsers;

public sealed record ListUsersQuery(int Page, int PageSize) : IQuery<List<AdminUserItem>>;

public sealed record AdminUserItem(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    bool IsEmailVerified,
    bool IsAdmin,
    bool IsLocked);