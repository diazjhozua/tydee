using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Expenses.Delete;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Expenses;

internal sealed class DeleteExpense : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/expenses/{expenseId:guid}", async (
            Guid expenseId,
            IUserContext userContext,
            ICommandHandler<DeleteExpenseCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new DeleteExpenseCommand(userContext.UserId, expenseId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Expenses)
        .WithSummary("Delete an expense.")
        .RequireAuthorization();
    }
}
