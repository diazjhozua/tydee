using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.Update;
using Contracts.Accounts;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class UpdateAccount : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/accounts/{accountId:guid}", async (
            Guid accountId,
            UpdateAccountRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateAccountCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateAccountCommand(
                userContext.UserId,
                accountId,
                request.Name,
                request.Type,
                request.Icon,
                request.Color);

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Rename an account or change its type.")
        .RequireAuthorization();
    }
}
