using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.RecurringExpenses.Archive;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.RecurringExpenses;

internal sealed class ArchiveRecurringExpense : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/recurring-expenses/{recurringExpenseId:guid}", async (
            Guid recurringExpenseId,
            IUserContext userContext,
            ICommandHandler<ArchiveRecurringExpenseCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new ArchiveRecurringExpenseCommand(userContext.UserId, recurringExpenseId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.RecurringExpenses)
        .WithSummary("Archive a recurring expense. Its history is kept but it can no longer be used.")
        .RequireAuthorization();
    }
}