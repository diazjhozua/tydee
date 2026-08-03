using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Expenses.Create;
using Contracts.Expenses;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Expenses;

internal sealed class CreateExpense : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/expenses", async (
            CreateExpenseRequest request,
            IUserContext userContext,
            ICommandHandler<CreateExpenseCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new CreateExpenseCommand(
                userContext.UserId,
                request.AccountId,
                request.Amount,
                request.Note,
                request.Category,
                request.Date);

            Result<Guid> result = await handler.Handle(command, cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Expenses)
        .WithSummary("Log an expense against an account.")
        .RequireAuthorization();
    }
}
