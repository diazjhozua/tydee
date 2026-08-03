using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Incomes.Sources;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Incomes;

internal sealed class GetIncomeSources : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/incomes/sources", async (
            IUserContext userContext,
            IQueryHandler<GetIncomeSourcesQuery, List<string>> handler,
            CancellationToken cancellationToken) =>
        {
            Result<List<string>> result = await handler.Handle(
                new GetIncomeSourcesQuery(userContext.UserId),
                cancellationToken);

            return result.Match(Results.Ok, CustomResults.Problem);
        })
        .WithTags(Tags.Incomes)
        .WithSummary("Income sources the user has logged before, most recent first.")
        .RequireAuthorization();
    }
}
