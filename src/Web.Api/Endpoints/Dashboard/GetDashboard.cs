using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Dashboard.Get;
using Contracts.Dashboard;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Dashboard;

internal sealed class GetDashboard : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/dashboard", async (
            IUserContext userContext,
            IQueryHandler<GetDashboardQuery, DashboardResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<DashboardResult> result = await handler.Handle(
                new GetDashboardQuery(userContext.UserId),
                cancellationToken);

            return result.Match(
                d => Results.Ok(new DashboardResponse(
                    d.AccountBalances
                        .Select(a => new AccountBalanceItem(
                            a.AccountId, a.Name, a.Type.ToString(), a.AllocationPercent, a.Balance))
                        .ToList(),
                    d.TotalSpentThisMonth,
                    d.RecentActivity
                        .Select(x => new ActivityItem(x.Id, x.Kind, x.Amount, x.Description, x.Date))
                        .ToList())),
                CustomResults.Problem);
        })
        .WithTags(Tags.Dashboard)
        .WithSummary("Home screen data: balances, total spent this month, and recent activity.")
        .RequireAuthorization();
    }
}
