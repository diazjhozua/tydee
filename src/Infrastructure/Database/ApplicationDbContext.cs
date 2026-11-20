using Application.Abstractions.Data;
using Domain.Accounts;
using Domain.Adjustments;
using Domain.CardPayments;
using Domain.Transfers;
using Domain.Expenses;
using Domain.Incomes;
using Domain.RecurringExpenses;
using Domain.Suggestions;
using Domain.Users;
using Infrastructure.DomainEvents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SharedKernel;

namespace Infrastructure.Database;

public sealed class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options,
    IDomainEventsDispatcher domainEventsDispatcher)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users { get; set; }

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public DbSet<Account> Accounts { get; set; }

    public DbSet<Income> Incomes { get; set; }

    public DbSet<IncomeAllocation> IncomeAllocations { get; set; }

    public DbSet<Expense> Expenses { get; set; }

    public DbSet<RecurringExpense> RecurringExpenses { get; set; }

    public DbSet<Adjustment> Adjustments { get; set; }

    public DbSet<Transfer> Transfers { get; set; }

    public DbSet<CardPayment> CardPayments { get; set; }

    public DbSet<Suggestion> Suggestions { get; set; }

    public DbSet<PendingEmail> PendingEmails { get; set; }

    public DbSet<EmailVerification> EmailVerifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        modelBuilder.HasDefaultSchema(Schemas.Default);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Events are dispatched after the save so handlers never run for
        // changes that failed to persist.
        List<IDomainEvent> domainEvents = ExtractDomainEvents();

        int result = await base.SaveChangesAsync(cancellationToken);

        await domainEventsDispatcher.DispatchAsync(domainEvents, cancellationToken);

        return result;
    }

    public Task<IUserLock> LockUserByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        LockUserAsync($"SELECT 1 FROM public.users WHERE id = {userId} FOR UPDATE", cancellationToken);

    public Task<IUserLock> LockUserByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        LockUserAsync($"SELECT 1 FROM public.users WHERE email = {email} FOR UPDATE", cancellationToken);

    public Task<bool> HasPendingEmailsAsync(DateTime utcNow, CancellationToken cancellationToken = default) =>
        PendingEmails.AnyAsync(p => p.NextAttemptOnUtc <= utcNow, cancellationToken);

    public async Task<IPendingEmailClaim> ClaimNextPendingEmailAsync(
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        if (!Database.IsRelational())
        {
            PendingEmail? first = await PendingEmails
                .Where(p => p.NextAttemptOnUtc <= utcNow)
                .OrderBy(p => p.NextAttemptOnUtc)
                .FirstOrDefaultAsync(cancellationToken);

            return new PendingEmailClaim(first, null);
        }

        IDbContextTransaction transaction = await Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // SKIP LOCKED makes a second worker pass over a row this one holds, instead of waiting on it.
            // The interpolated timestamp is sent as a bound parameter, not spliced into the SQL.
            PendingEmail? next = await PendingEmails
                .FromSql(
                    $"""
                    SELECT * FROM public.pending_emails
                    WHERE next_attempt_on_utc <= {utcNow}
                    ORDER BY next_attempt_on_utc
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                    """)
                .FirstOrDefaultAsync(cancellationToken);

            return new PendingEmailClaim(next, transaction);
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    private async Task<IUserLock> LockUserAsync(FormattableString lockStatement, CancellationToken cancellationToken)
    {
        if (!Database.IsRelational())
        {
            return UserLock.None;
        }

        IDbContextTransaction transaction = await Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // FOR UPDATE holds the row until the transaction ends. The statement's
            // parameters are bound, so the email and id are never spliced into SQL.
            await Database.ExecuteSqlInterpolatedAsync(lockStatement, cancellationToken);

            return new UserLock(transaction);
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    private List<IDomainEvent> ExtractDomainEvents()
    {
        return ChangeTracker
            .Entries<Entity>()
            .Select(entry => entry.Entity)
            .SelectMany(entity =>
            {
                List<IDomainEvent> domainEvents = entity.DomainEvents;

                entity.ClearDomainEvents();

                return domainEvents;
            })
            .ToList();
    }
}
