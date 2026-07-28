using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Incomes.Delete;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Incomes;

internal sealed class DeleteIncome : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/incomes/{incomeId:guid}", async (
            Guid incomeId,
            IUserContext userContext,
            ICommandHandler<DeleteIncomeCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new DeleteIncomeCommand(userContext.UserId, incomeId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Incomes)
        .WithSummary("Delete an income and its allocations.")
        .RequireAuthorization();
    }
}
