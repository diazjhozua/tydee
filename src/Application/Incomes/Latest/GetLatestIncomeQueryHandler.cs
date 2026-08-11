using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Incomes.Get;
using Domain.Incomes;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Incomes.Latest;

internal sealed class GetLatestIncomeQueryHandler(IApplicationDbContext context)
    : IQueryHandler<GetLatestIncomeQuery, IncomeResult>
{
    public async Task<Result<IncomeResult>> Handle(
        GetLatestIncomeQuery query, CancellationToken cancellationToken)
    {
        Income? income = await context.Incomes
            .Include(i => i.Allocations)
            .Where(i => i.UserId == query.UserId)
            .OrderByDescending(i => i.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

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
