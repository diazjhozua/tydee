using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Incomes;
using Application.Incomes.Update;
using Contracts.Incomes;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Incomes;

internal sealed class UpdateIncome : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/incomes/{incomeId:guid}", async (
            Guid incomeId,
            UpdateIncomeRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateIncomeCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateIncomeCommand(
                userContext.UserId,
                incomeId,
                request.Amount,
                request.Source,
                request.Date,
                request.Allocations
                    .Select(a => new IncomeAllocationItem(a.AccountId, a.Amount))
                    .ToList());

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Incomes)
        .WithSummary("Edit an income. Its allocations are replaced with the ones provided.")
        .RequireAuthorization();
    }
}
