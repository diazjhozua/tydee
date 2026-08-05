using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Adjustments.Delete;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Adjustments;

internal sealed class DeleteAdjustment : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/adjustments/{adjustmentId:guid}", async (
            Guid adjustmentId,
            IUserContext userContext,
            ICommandHandler<DeleteAdjustmentCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new DeleteAdjustmentCommand(userContext.UserId, adjustmentId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Delete a balance adjustment; the account balance reverts accordingly.")
        .RequireAuthorization();
    }
}
