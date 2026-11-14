using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Accounts;
using Domain.Accounts;
using Domain.CardPayments;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.CardPayments.Statement;

internal sealed class GetCardStatementQueryHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : IQueryHandler<GetCardStatementQuery, CardStatementResult>
{
    public async Task<Result<CardStatementResult>> Handle(GetCardStatementQuery query, CancellationToken cancellationToken)
    {
        Account? account = await context.Accounts.SingleOrDefaultAsync(
            a => a.Id == query.AccountId && a.UserId == query.UserId,
            cancellationToken);

        if (account is null)
        {
            return Result.Failure<CardStatementResult>(AccountErrors.NotFound);
        }

        if (account.Type != AccountType.CreditCard)
        {
            return Result.Failure<CardStatementResult>(CardPaymentErrors.NotCreditCard);
        }

        DateTime now = dateTimeProvider.UtcNow;
        int year = query.Year ?? now.Year;
        int month = query.Month ?? now.Month;

        if (year is < 2000 or > 2200)
        {
            return Result.Failure<CardStatementResult>(CardPaymentErrors.InvalidYear);
        }

        if (month is < 1 or > 12)
        {
            return Result.Failure<CardStatementResult>(CardPaymentErrors.InvalidMonth);
        }

        var monthStart = new DateOnly(year, month, 1);
        DateOnly monthEnd = monthStart.AddMonths(1);

        // Owed is all-time: the card's balance is negative while money is still owed on it.
        Dictionary<Guid, decimal> balances = await BalanceCalculator.ForUserAsync(
            context, query.UserId, cancellationToken);

        decimal owed = -balances.GetValueOrDefault(account.Id);

        List<CardStatementPayment> payments = await context.CardPayments
            .Where(p => p.UserId == query.UserId &&
                        p.CardAccountId == account.Id &&
                        p.Date >= monthStart && p.Date < monthEnd)
            .OrderByDescending(p => p.Date).ThenByDescending(p => p.CreatedAtUtc)
            .Join(
                context.Accounts,
                p => p.FromAccountId,
                from => from.Id,
                (p, from) => new CardStatementPayment(p.Id, p.FromAccountId, from.Name, p.Amount, p.Date))
            .ToListAsync(cancellationToken);

        decimal paidThisMonth = payments.Sum(p => p.Amount);

        CardPaymentState state = owed switch
        {
            0m => CardPaymentState.Settled,
            < 0m => CardPaymentState.InCredit,
            _ => paidThisMonth > 0m ? CardPaymentState.PartiallyPaid : CardPaymentState.Unpaid,
        };

        return new CardStatementResult(account.Id, account.Name, owed, paidThisMonth, state, payments);
    }
}
