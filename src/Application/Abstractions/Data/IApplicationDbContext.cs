using Domain.Accounts;
using Domain.Adjustments;
using Domain.CardPayments;
using Domain.Transfers;
using Domain.Expenses;
using Domain.Incomes;
using Domain.RecurringExpenses;
using Domain.Suggestions;
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
    DbSet<RecurringExpense> RecurringExpenses { get; }
    DbSet<Adjustment> Adjustments { get; }
    DbSet<Transfer> Transfers { get; }
    DbSet<CardPayment> CardPayments { get; }
    DbSet<Suggestion> Suggestions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Locks one user row for the life of the returned transaction, so an admin lock
    /// and a login or refresh cannot interleave. Load the user only after this call,
    /// so the read sees the state the other side committed.
    /// </summary>
    Task<IUserLock> LockUserByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Locks the user row with this email. Used by login, before the user is loaded.
    /// Does nothing when no user has the email.
    /// </summary>
    Task<IUserLock> LockUserByEmailAsync(string email, CancellationToken cancellationToken = default);
}
