using Domain.Accounts;
using Domain.Adjustments;
using Domain.Transfers;
using Domain.Expenses;
using Domain.Incomes;
using Domain.Users;
using Microsoft.EntityFrameworkCore;

namespace Application.Abstractions.Data;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Account> Accounts { get; }
    DbSet<Income> Incomes { get; }
    DbSet<IncomeAllocation> IncomeAllocations { get; }
    DbSet<Expense> Expenses { get; }
    DbSet<Adjustment> Adjustments { get; }
    DbSet<Transfer> Transfers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
