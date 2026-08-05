using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.Adjustments;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.SetBalance;

internal sealed class SetAccountBalanceCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<SetAccountBalanceCommand, Guid>
{
    public async Task<Result<Guid>> Handle(SetAccountBalanceCommand command, CancellationToken cancellationToken)
    {
        Account? account = await context.Accounts.SingleOrDefaultAsync(
            a => a.Id == command.AccountId && a.UserId == command.UserId,
            cancellationToken);

        if (account is null)
        {
            return Result.Failure<Guid>(AccountErrors.NotFound);
        }

        if (account.IsArchived)
        {
            return Result.Failure<Guid>(AccountErrors.Archived);
        }

        Dictionary<Guid, decimal> balances = await BalanceCalculator.ForUserAsync(
            context, command.UserId, cancellationToken);

        decimal delta = command.NewBalance - balances.GetValueOrDefault(account.Id);

        if (delta == 0)
        {
            return Result.Failure<Guid>(AdjustmentErrors.BalanceUnchanged);
        }

        var adjustment = new Adjustment
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            AccountId = account.Id,
            Amount = delta,
            Date = command.Date,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.Adjustments.Add(adjustment);

        await context.SaveChangesAsync(cancellationToken);

        return adjustment.Id;
    }
}
