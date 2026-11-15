using Application.Abstractions.Data;
using Microsoft.EntityFrameworkCore;

namespace Application.Accounts;

internal static class BalanceCalculator
{
    // Balance = income allocated to the account minus expenses taken from it.
    // A card payment raises the card's balance and lowers the paying account's,
    // so a negative credit card balance is money owed on the card.
    public static async Task<Dictionary<Guid, decimal>> ForUserAsync(
        IApplicationDbContext context,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var allocated = await context.IncomeAllocations
            .Where(a => context.Accounts
                .Any(acc => acc.Id == a.AccountId && acc.UserId == userId))
            .GroupBy(a => a.AccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(a => a.Amount) })
            .ToListAsync(cancellationToken);

        var adjusted = await context.Adjustments
            .Where(a => a.UserId == userId)
            .GroupBy(a => a.AccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(a => a.Amount) })
            .ToListAsync(cancellationToken);

        var transferredOut = await context.Transfers
            .Where(t => t.UserId == userId)
            .GroupBy(t => t.FromAccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        var transferredIn = await context.Transfers
            .Where(t => t.UserId == userId)
            .GroupBy(t => t.ToAccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(t => t.Amount) })
            .ToListAsync(cancellationToken);

        var cardPaid = await context.CardPayments
            .Where(p => p.UserId == userId)
            .GroupBy(p => p.CardAccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(p => p.Amount) })
            .ToListAsync(cancellationToken);

        var cardPaidFrom = await context.CardPayments
            .Where(p => p.UserId == userId)
            .GroupBy(p => p.FromAccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(p => p.Amount) })
            .ToListAsync(cancellationToken);

        var spent = await context.Expenses
            .Where(e => e.UserId == userId)
            .GroupBy(e => e.AccountId)
            .Select(g => new { AccountId = g.Key, Total = g.Sum(e => e.Amount) })
            .ToListAsync(cancellationToken);

        var balances = allocated.ToDictionary(x => x.AccountId, x => x.Total);

        foreach (var adjustment in adjusted)
        {
            balances[adjustment.AccountId] =
                balances.GetValueOrDefault(adjustment.AccountId) + adjustment.Total;
        }

        foreach (var incoming in transferredIn)
        {
            balances[incoming.AccountId] =
                balances.GetValueOrDefault(incoming.AccountId) + incoming.Total;
        }

        foreach (var outgoing in transferredOut)
        {
            balances[outgoing.AccountId] =
                balances.GetValueOrDefault(outgoing.AccountId) - outgoing.Total;
        }

        foreach (var payment in cardPaid)
        {
            balances[payment.AccountId] =
                balances.GetValueOrDefault(payment.AccountId) + payment.Total;
        }

        foreach (var payment in cardPaidFrom)
        {
            balances[payment.AccountId] =
                balances.GetValueOrDefault(payment.AccountId) - payment.Total;
        }

        foreach (var expense in spent)
        {
            balances[expense.AccountId] =
                balances.GetValueOrDefault(expense.AccountId) - expense.Total;
        }

        return balances;
    }
}
