using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Incomes;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Incomes.Get;

internal sealed class GetIncomeQueryHandler(IApplicationDbContext context)
    : IQueryHandler<GetIncomeQuery, IncomeResult>
{
    public async Task<Result<IncomeResult>> Handle(GetIncomeQuery query, CancellationToken cancellationToken)
    {
        Income? income = await context.Incomes
            .Include(i => i.Allocations)
            .SingleOrDefaultAsync(
                i => i.Id == query.IncomeId && i.UserId == query.UserId,
                cancellationToken);

        if (income is null)
        {
            return Result.Failure<IncomeResult>(IncomeErrors.NotFound);
        }

        return new IncomeResult(
            income.Id,
            income.Amount,
            income.Source,
            income.Date,
            income.Allocations
                .Select(a => new IncomeAllocationResult(a.AccountId, a.Amount))
                .ToList());
    }
}
