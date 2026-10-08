using Application.Abstractions.Messaging;
using Application.Admin.ListUsers;
using Contracts.Admin;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Admin;

internal sealed class ListUsers : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/admin/users", async (
            int? page,
            int? pageSize,
            IQueryHandler<ListUsersQuery, List<AdminUserItem>> handler,
            CancellationToken cancellationToken) =>
        {
            var query = new ListUsersQuery(page ?? 1, pageSize ?? 50);

            Result<List<AdminUserItem>> result = await handler.Handle(query, cancellationToken);

            return result.Match(
                items => Results.Ok(items
                    .Select(u => new AdminUserResponse(
                        u.Id,
                        u.Email,
                        u.FirstName,
                        u.LastName,
                        u.IsEmailVerified,
                        u.IsAdmin,
                        u.IsLocked))
                    .ToList()),
                CustomResults.Problem);
        })
        .WithTags(Tags.Admin)
        .WithSummary("List registered users. Admin only.")
        .RequireAuthorization("Admin");
    }
}