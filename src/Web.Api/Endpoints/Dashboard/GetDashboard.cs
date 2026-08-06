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
            int? year,
            int? month,
            IUserContext userContext,
            IQueryHandler<GetDashboardQuery, DashboardResult> handler,
            CancellationToken cancellationToken) =>
        {
            if (month is < 1 or > 12 || year is < 2000 or > 2200 || year is null != month is null)
            {
                return CustomResults.Problem(Result.Failure<DashboardResult>(Error.Problem(
                    "Dashboard.InvalidMonth",
                    "Provide both year and month, with month between 1 and 12.")));
            }

            Result<DashboardResult> result = await handler.Handle(
                new GetDashboardQuery(userContext.UserId, year, month),
                cancellationToken);

            return result.Match(
                d => Results.Ok(new DashboardResponse(
                    d.AccountBalances
                        .Select(a => new AccountBalanceItem(
                            a.AccountId, a.Name, a.Type.ToString(), a.AllocationPercent, a.Balance))
                        .ToList(),
                    d.TotalSpentThisMonth,
                    d.SpentByCategory
                        .Select(c => new CategorySpendItem(c.Category, c.Amount))
                        .ToList(),
                    d.RecentActivity
                        .Select(x => new ActivityItem(
                            x.Id,
                            x.Kind,
                            x.Amount,
                            x.Description,
                            x.Category,
                            x.Date,
                            x.Allocations
                                .Select(a => new ActivityAllocationItem(a.AccountName, a.Amount))
                                .ToList()))
                        .ToList())),
                CustomResults.Problem);
        })
        .WithTags(Tags.Dashboard)
        .WithSummary("Home screen data: balances, total spent this month, and recent activity.")
        .RequireAuthorization();
    }
}
