using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Expenses.Update;
using Contracts.Expenses;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Expenses;

internal sealed class UpdateExpense : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/expenses/{expenseId:guid}", async (
            Guid expenseId,
            UpdateExpenseRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateExpenseCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateExpenseCommand(
                userContext.UserId,
                expenseId,
                request.AccountId,
                request.Amount,
                request.Note,
                request.Date);

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Expenses)
        .WithSummary("Edit an expense.")
        .RequireAuthorization();
    }
}
