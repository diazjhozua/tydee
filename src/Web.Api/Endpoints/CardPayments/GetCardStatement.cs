using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.CardPayments.Statement;
using Contracts.CardPayments;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.CardPayments;

internal sealed class GetCardStatement : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/accounts/{accountId:guid}/card-statement", async (
            Guid accountId,
            int? year,
            int? month,
            IUserContext userContext,
            IQueryHandler<GetCardStatementQuery, CardStatementResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<CardStatementResult> result = await handler.Handle(
                new GetCardStatementQuery(userContext.UserId, accountId, year, month),
                cancellationToken);

            return result.Match(
                s => Results.Ok(new CardStatementResponse(
                    s.AccountId,
                    s.Name,
                    s.Owed,
                    s.PaidThisMonth,
                    s.PaymentState.ToString(),
                    s.Payments
                        .Select(p => new CardStatementPaymentItem(
                            p.Id, p.FromAccountId, p.FromAccountName, p.Amount, p.Date))
                        .ToList())),
                CustomResults.Problem);
        })
        .WithTags(Tags.Accounts)
        .WithSummary("Credit card statement for one month: owed balance, payments, and payment state.")
        .RequireAuthorization();
    }
}
