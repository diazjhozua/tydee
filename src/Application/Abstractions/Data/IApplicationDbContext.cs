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
    DbSet<PendingEmail> PendingEmails { get; }
    DbSet<EmailVerification> EmailVerifications { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// True when at least one queued account email is due at <paramref name="utcNow"/>. Lets the worker skip
    /// a tick without starting a command.
    /// </summary>
    Task<bool> HasPendingEmailsAsync(DateTime utcNow, CancellationToken cancellationToken = default);

    /// <summary>
    /// Claims the oldest queued email that is due at <paramref name="utcNow"/>. Rows already claimed by another
    /// worker are skipped. Returns a claim with a null request when nothing is due.
    /// </summary>
    Task<IPendingEmailClaim> ClaimNextPendingEmailAsync(
        DateTime utcNow,
        CancellationToken cancellationToken = default);

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
