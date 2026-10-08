using Application.Abstractions.Messaging;
using Application.Admin.GetStats;
using Contracts.Admin;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Admin;

internal sealed class GetStats : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/admin/stats", async (
            IQueryHandler<GetStatsQuery, StatsResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<StatsResult> result = await handler.Handle(new GetStatsQuery(), cancellationToken);

            return result.Match(
                stats => Results.Ok(new StatsResponse(
                    stats.Users,
                    stats.VerifiedUsers,
                    stats.Accounts,
                    stats.Expenses,
                    stats.OpenSuggestions)),
                CustomResults.Problem);
        })
        .WithTags(Tags.Admin)
        .WithSummary("Aggregate counts for the admin dashboard. Admin only.")
        .RequireAuthorization("Admin");
    }
}