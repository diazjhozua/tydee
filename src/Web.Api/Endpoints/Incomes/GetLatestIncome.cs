using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Incomes.Get;
using Application.Incomes.Latest;
using Contracts.Incomes;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Incomes;

internal sealed class GetLatestIncome : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/incomes/latest", async (
            IUserContext userContext,
            IQueryHandler<GetLatestIncomeQuery, IncomeResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<IncomeResult> result = await handler.Handle(
                new GetLatestIncomeQuery(userContext.UserId),
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
        .WithSummary("Get the most recently logged income, for prefilling a new one.")
        .RequireAuthorization();
    }
}
