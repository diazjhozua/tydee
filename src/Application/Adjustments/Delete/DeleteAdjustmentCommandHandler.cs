using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Adjustments;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Adjustments.Delete;

internal sealed class DeleteAdjustmentCommandHandler(IApplicationDbContext context)
    : ICommandHandler<DeleteAdjustmentCommand>
{
    public async Task<Result> Handle(DeleteAdjustmentCommand command, CancellationToken cancellationToken)
    {
        Adjustment? adjustment = await context.Adjustments.SingleOrDefaultAsync(
            a => a.Id == command.AdjustmentId && a.UserId == command.UserId,
            cancellationToken);

        if (adjustment is null)
        {
            return Result.Failure(AdjustmentErrors.NotFound);
        }

        context.Adjustments.Remove(adjustment);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
