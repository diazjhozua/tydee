using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.Create;
using Contracts.Accounts;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class CreateAccount : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/accounts", async (
            CreateAccountRequest request,
            IUserContext userContext,
            ICommandHandler<CreateAccountCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new CreateAccountCommand(
                userContext.UserId,
                request.Name,
                request.Type,
                request.AllocationPercent,
                request.Icon,
                request.Color);

            Result<Guid> result = await handler.Handle(command, cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Create an account (envelope) to allocate money into.")
        .RequireAuthorization();
    }
}
