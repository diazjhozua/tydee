using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Incomes.Get;
using Contracts.Incomes;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Incomes;

internal sealed class GetIncome : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/incomes/{incomeId:guid}", async (
            Guid incomeId,
            IUserContext userContext,
            IQueryHandler<GetIncomeQuery, IncomeResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<IncomeResult> result = await handler.Handle(
                new GetIncomeQuery(userContext.UserId, incomeId),
                cancellationToken);

            return result.Match(
                i => Results.Ok(new IncomeResponse(
                    i.Id,
                    i.Amount,
                    i.Source,
                    i.Date,
                    i.Allocations
                        .Select(a => new AllocationLineItem(a.AccountId, a.Amount))
                        .ToList())),
                CustomResults.Problem);
        })
        .WithTags(Tags.Incomes)
        .WithSummary("Get a single income with its allocation lines.")
        .RequireAuthorization();
    }
}
