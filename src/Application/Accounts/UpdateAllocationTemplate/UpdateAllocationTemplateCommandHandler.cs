using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.UpdateAllocationTemplate;

internal sealed class UpdateAllocationTemplateCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateAllocationTemplateCommand>
{
    public async Task<Result> Handle(UpdateAllocationTemplateCommand command, CancellationToken cancellationToken)
    {
        List<Account> accounts = await context.Accounts
            .Where(a => a.UserId == command.UserId && !a.IsArchived)
            .ToListAsync(cancellationToken);

        var requestedIds = command.Items.Select(i => i.AccountId).ToHashSet();
        var activeIds = accounts.Select(a => a.Id).ToHashSet();

        if (!requestedIds.SetEquals(activeIds) || command.Items.Count != requestedIds.Count)
        {
            return Result.Failure(AllocationErrors.AllAccountsRequired);
        }

        if (command.Items.Sum(i => i.Percent) != 100m)
        {
            return Result.Failure(AllocationErrors.MustTotal100);
        }

        var percentByAccount = command.Items.ToDictionary(i => i.AccountId, i => i.Percent);

        foreach (Account account in accounts)
        {
            account.AllocationPercent = percentByAccount[account.Id];
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
