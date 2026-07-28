using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Incomes;
using Application.Incomes.Create;
using Contracts.Incomes;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Incomes;

internal sealed class CreateIncome : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/incomes", async (
            CreateIncomeRequest request,
            IUserContext userContext,
            ICommandHandler<CreateIncomeCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new CreateIncomeCommand(
                userContext.UserId,
                request.Amount,
                request.Source,
                request.Date,
                request.Allocations
                    .Select(a => new IncomeAllocationItem(a.AccountId, a.Amount))
                    .ToList());

            Result<Guid> result = await handler.Handle(command, cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Incomes)
        .WithSummary("Log an income and split it across accounts. Allocations must sum to the amount.")
        .RequireAuthorization();
    }
}
