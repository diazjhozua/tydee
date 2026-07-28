using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Accounts.UpdateAllocationTemplate;
using Contracts.Accounts;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Accounts;

internal sealed class UpdateAllocationTemplate : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/accounts/template", async (
            UpdateAllocationTemplateRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateAllocationTemplateCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateAllocationTemplateCommand(
                userContext.UserId,
                request.Items
                    .Select(i => new AllocationTemplateItem(i.AccountId, i.Percent))
                    .ToList());

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Set the allocation template. Percents must cover all active accounts and total 100.")
        .RequireAuthorization();
    }
}
