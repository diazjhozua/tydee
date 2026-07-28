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

        account.IsArchived = true;

        // Freed percent goes back to the user to redistribute via the template.
        account.AllocationPercent = 0;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
