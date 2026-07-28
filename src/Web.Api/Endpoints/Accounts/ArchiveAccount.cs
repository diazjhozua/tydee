using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.Archive;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class ArchiveAccount : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/accounts/{accountId:guid}", async (
            Guid accountId,
            IUserContext userContext,
            ICommandHandler<ArchiveAccountCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new ArchiveAccountCommand(userContext.UserId, accountId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Archive an account. Its history is kept but it can no longer be used.")
        .RequireAuthorization();
    }
}
