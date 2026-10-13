using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.RecurringExpenses.Create;
using Contracts.RecurringExpenses;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.RecurringExpenses;

internal sealed class CreateRecurringExpense : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/recurring-expenses", async (
            CreateRecurringExpenseRequest request,
            IUserContext userContext,
            ICommandHandler<CreateRecurringExpenseCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new CreateRecurringExpenseCommand(
                userContext.UserId,
                request.Name,
                request.AccountId,
                request.Amount,
                request.Category,
                request.Note);

            Result<Guid> result = await handler.Handle(command, cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.RecurringExpenses)
        .WithSummary("Create a recurring expense.")
        .RequireAuthorization();
    }
}