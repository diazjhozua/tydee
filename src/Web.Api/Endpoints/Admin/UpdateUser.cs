using Application.Abstractions.Messaging;
using Application.Admin.UpdateUser;
using Contracts.Admin;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Admin;

internal sealed class UpdateUser : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("api/v1/admin/users/{userId:guid}", async (
            Guid userId,
            UpdateUserRequest request,
            ICommandHandler<UpdateUserCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateUserCommand(userId, request.IsEmailVerified, request.IsLocked);

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Admin)
        .WithSummary("Verify or lock a user. Admin only.")
        .RequireAuthorization("Admin");
    }
}