using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.Transfers;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Transfers.Create;

internal sealed class CreateTransferCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateTransferCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateTransferCommand command, CancellationToken cancellationToken)
    {
        if (command.FromAccountId == command.ToAccountId)
        {
            return Result.Failure<Guid>(TransferErrors.SameAccount);
        }

        List<Account> accounts = await context.Accounts
            .Where(a => a.UserId == command.UserId &&
                        (a.Id == command.FromAccountId || a.Id == command.ToAccountId))
            .ToListAsync(cancellationToken);

        if (accounts.Count != 2)
        {
            return Result.Failure<Guid>(AccountErrors.NotFound);
        }

        if (accounts.Any(a => a.IsArchived))
        {
            return Result.Failure<Guid>(AccountErrors.Archived);
        }

        var transfer = new Transfer
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            FromAccountId = command.FromAccountId,
            ToAccountId = command.ToAccountId,
            Amount = command.Amount,
            Date = command.Date,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.Transfers.Add(transfer);

        await context.SaveChangesAsync(cancellationToken);

        return transfer.Id;
    }
}
