using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.Archive;

internal sealed class ArchiveAccountCommandHandler(IApplicationDbContext context)
    : ICommandHandler<ArchiveAccountCommand>
{
    public async Task<Result> Handle(ArchiveAccountCommand command, CancellationToken cancellationToken)
    {
        Account? account = await context.Accounts.SingleOrDefaultAsync(
            a => a.Id == command.AccountId && a.UserId == command.UserId,
            cancellationToken);

        if (account is null)
        {
            return Result.Failure(AccountErrors.NotFound);
        }

        if (account.IsArchived)
        {
            return Result.Failure(AccountErrors.Archived);
        }

        if (account.Type == AccountType.CreditCard)
        {
            Dictionary<Guid, decimal> balances = await BalanceCalculator.ForUserAsync(
                context, command.UserId, cancellationToken);

            decimal balance = balances.GetValueOrDefault(account.Id);

            // A negative balance on a card is money still owed on it; a positive one is credit.
            if (balance < 0m)
            {
                return Result.Failure(AccountErrors.HasOwedBalance);
            }

            if (balance > 0m)
            {
                return Result.Failure(AccountErrors.CardHasCredit);
            }
        }

        account.IsArchived = true;

        // Freed percent goes back to the user to redistribute via the template.
        account.AllocationPercent = 0;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
