using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.RecurringExpenses.Update;
using Contracts.RecurringExpenses;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.RecurringExpenses;

internal sealed class UpdateRecurringExpense : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPut("api/v1/recurring-expenses/{recurringExpenseId:guid}", async (
            Guid recurringExpenseId,
            UpdateRecurringExpenseRequest request,
            IUserContext userContext,
            ICommandHandler<UpdateRecurringExpenseCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateRecurringExpenseCommand(
                userContext.UserId,
                recurringExpenseId,
                request.Name,
                request.AccountId,
                request.Amount,
                request.Category,
                request.Note);

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.RecurringExpenses)
        .WithSummary("Edit a recurring expense.")
        .RequireAuthorization();
    }
}