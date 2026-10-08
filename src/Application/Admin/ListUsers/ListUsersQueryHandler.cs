using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Admin.ListUsers;

internal sealed class ListUsersQueryHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : IQueryHandler<ListUsersQuery, List<AdminUserItem>>
{
    public async Task<Result<List<AdminUserItem>>> Handle(
        ListUsersQuery query,
        CancellationToken cancellationToken)
    {
        int page = Math.Max(query.Page, 1);
        int pageSize = Math.Clamp(query.PageSize, 1, 100);
        DateTime now = dateTimeProvider.UtcNow;

        return await context.Users
            .OrderByDescending(u => u.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserItem(
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.IsEmailVerified,
                u.IsAdmin,
                u.LockoutEndUtc != null && u.LockoutEndUtc > now))
            .ToListAsync(cancellationToken);
    }
}