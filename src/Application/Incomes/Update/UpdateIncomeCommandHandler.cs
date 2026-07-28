using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Incomes;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Incomes.Update;

internal sealed class UpdateIncomeCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateIncomeCommand>
{
    public async Task<Result> Handle(UpdateIncomeCommand command, CancellationToken cancellationToken)
    {
        Income? income = await context.Incomes
            .Include(i => i.Allocations)
            .SingleOrDefaultAsync(
                i => i.Id == command.IncomeId && i.UserId == command.UserId,
                cancellationToken);

        if (income is null)
        {
            return Result.Failure(IncomeErrors.NotFound);
        }

        Result guard = await AllocationGuard.CheckAsync(
            context, command.UserId, command.Amount, command.Allocations, cancellationToken);

        if (guard.IsFailure)
        {
            return guard;
        }

        income.Amount = command.Amount;
        income.Source = command.Source;
        income.Date = command.Date;

        context.IncomeAllocations.RemoveRange(income.Allocations);

        foreach (IncomeAllocationItem item in command.Allocations)
        {
            context.IncomeAllocations.Add(new IncomeAllocation
            {
                Id = Guid.NewGuid(),
                IncomeId = income.Id,
                AccountId = item.AccountId,
                Amount = item.Amount,
            });
        }

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
