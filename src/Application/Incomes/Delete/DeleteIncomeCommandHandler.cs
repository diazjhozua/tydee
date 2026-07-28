using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Incomes;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Incomes.Delete;

internal sealed class DeleteIncomeCommandHandler(IApplicationDbContext context)
    : ICommandHandler<DeleteIncomeCommand>
{
    public async Task<Result> Handle(DeleteIncomeCommand command, CancellationToken cancellationToken)
    {
        Income? income = await context.Incomes.SingleOrDefaultAsync(
            i => i.Id == command.IncomeId && i.UserId == command.UserId,
            cancellationToken);

        if (income is null)
        {
            return Result.Failure(IncomeErrors.NotFound);
        }

        context.Incomes.Remove(income);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
