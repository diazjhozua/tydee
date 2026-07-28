using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Incomes;
using SharedKernel;

namespace Application.Incomes.Create;

internal sealed class CreateIncomeCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateIncomeCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateIncomeCommand command, CancellationToken cancellationToken)
    {
        Result guard = await AllocationGuard.CheckAsync(
            context, command.UserId, command.Amount, command.Allocations, cancellationToken);

        if (guard.IsFailure)
        {
            return Result.Failure<Guid>(guard.Error);
        }

        var income = new Income
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Amount = command.Amount,
            Source = command.Source,
            Date = command.Date,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.Incomes.Add(income);

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

        return income.Id;
    }
}
