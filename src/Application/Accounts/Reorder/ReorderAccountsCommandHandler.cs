using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.Reorder;

internal sealed class ReorderAccountsCommandHandler(IApplicationDbContext context)
    : ICommandHandler<ReorderAccountsCommand>
{
    public async Task<Result> Handle(ReorderAccountsCommand command, CancellationToken cancellationToken)
    {
        List<Account> accounts = await context.Accounts
            .Where(a => a.UserId == command.UserId && !a.IsArchived)
            .ToListAsync(cancellationToken);

        var requestedIds = command.AccountIds.ToHashSet();
        var activeIds = accounts.Select(a => a.Id).ToHashSet();

        if (!requestedIds.SetEquals(activeIds) || command.AccountIds.Count != requestedIds.Count)
        {
            return Result.Failure(AccountErrors.AllAccountsRequired);
        }

        var accountsById = accounts.ToDictionary(a => a.Id);

        for (int index = 0; index < command.AccountIds.Count; index++)
        {
            accountsById[command.AccountIds[index]].DisplayOrder = index;
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
