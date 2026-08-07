using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Transfers;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Transfers.Delete;

internal sealed class DeleteTransferCommandHandler(IApplicationDbContext context)
    : ICommandHandler<DeleteTransferCommand>
{
    public async Task<Result> Handle(DeleteTransferCommand command, CancellationToken cancellationToken)
    {
        Transfer? transfer = await context.Transfers.SingleOrDefaultAsync(
            t => t.Id == command.TransferId && t.UserId == command.UserId,
            cancellationToken);

        if (transfer is null)
        {
            return Result.Failure(TransferErrors.NotFound);
        }

        context.Transfers.Remove(transfer);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
