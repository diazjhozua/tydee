using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.CardPayments.Create;
using Contracts.CardPayments;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.CardPayments;

internal sealed class CreateCardPayment : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/card-payments", async (
            CreateCardPaymentRequest request,
            IUserContext userContext,
            ICommandHandler<CreateCardPaymentCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            Result<Guid> result = await handler.Handle(
                new CreateCardPaymentCommand(
                    userContext.UserId,
                    request.FromAccountId,
                    request.CardAccountId,
                    request.Amount,
                    request.Date),
                cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Log a payment from one account to a credit card. It lowers the card's owed amount.")
        .RequireAuthorization();
    }
}
