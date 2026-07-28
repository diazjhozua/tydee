using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.List;

internal sealed class ListAccountsQueryHandler(IApplicationDbContext context)
    : IQueryHandler<ListAccountsQuery, List<AccountListItem>>
{
    public async Task<Result<List<AccountListItem>>> Handle(ListAccountsQuery query, CancellationToken cancellationToken)
    {
        List<Account> accounts = await context.Accounts
            .Where(a => a.UserId == query.UserId && (query.IncludeArchived || !a.IsArchived))
            .OrderBy(a => a.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        Dictionary<Guid, decimal> balances = await BalanceCalculator.ForUserAsync(
            context, query.UserId, cancellationToken);

        return accounts
            .Select(a => new AccountListItem(
                a.Id,
                a.Name,
                a.Type,
                a.AllocationPercent,
                balances.GetValueOrDefault(a.Id),
                a.IsArchived))
            .ToList();
    }
}
