using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.CardPayments.Delete;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.CardPayments;

internal sealed class DeleteCardPayment : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapDelete("api/v1/card-payments/{paymentId:guid}", async (
            Guid paymentId,
            IUserContext userContext,
            ICommandHandler<DeleteCardPaymentCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new DeleteCardPaymentCommand(userContext.UserId, paymentId),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Delete a card payment; the card and source balances revert.")
        .RequireAuthorization();
    }
}
