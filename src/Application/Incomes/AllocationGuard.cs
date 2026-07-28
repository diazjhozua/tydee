using Application.Abstractions.Data;
using Domain.Incomes;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Incomes;

internal static class AllocationGuard
{
    public static async Task<Result> CheckAsync(
        IApplicationDbContext context,
        Guid userId,
        decimal incomeAmount,
        IReadOnlyCollection<IncomeAllocationItem> allocations,
        CancellationToken cancellationToken)
    {
        if (allocations.Sum(a => a.Amount) != incomeAmount)
        {
            return Result.Failure(IncomeErrors.AllocationMismatch);
        }

        var accountIds = allocations.Select(a => a.AccountId).ToList();

        int validAccounts = await context.Accounts.CountAsync(
            a => accountIds.Contains(a.Id) && a.UserId == userId && !a.IsArchived,
            cancellationToken);

        if (validAccounts != accountIds.Distinct().Count() || accountIds.Count != accountIds.Distinct().Count())
        {
            return Result.Failure(IncomeErrors.AllocationAccountInvalid);
        }

        return Result.Success();
    }
}
