using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Expenses.Categories;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Expenses;

internal sealed class GetExpenseCategories : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/expenses/categories", async (
            IUserContext userContext,
            IQueryHandler<GetExpenseCategoriesQuery, List<string>> handler,
            CancellationToken cancellationToken) =>
        {
            Result<List<string>> result = await handler.Handle(
                new GetExpenseCategoriesQuery(userContext.UserId),
                cancellationToken);

            return result.Match(Results.Ok, CustomResults.Problem);
        })
        .WithTags(Tags.Expenses)
        .WithSummary("Categories the user has spent against, most recent first.")
        .RequireAuthorization();
    }
}
