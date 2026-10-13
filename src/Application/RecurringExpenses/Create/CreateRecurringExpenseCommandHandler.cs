using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.RecurringExpenses;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.RecurringExpenses.Create;

internal sealed class CreateRecurringExpenseCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateRecurringExpenseCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateRecurringExpenseCommand command, CancellationToken cancellationToken)
    {
        Account? account = await context.Accounts.SingleOrDefaultAsync(
            a => a.Id == command.AccountId && a.UserId == command.UserId,
            cancellationToken);

        if (account is null)
        {
            return Result.Failure<Guid>(AccountErrors.NotFound);
        }

        if (account.IsArchived)
        {
            return Result.Failure<Guid>(AccountErrors.Archived);
        }

        var recurringExpense = new RecurringExpense
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Name = command.Name,
            AccountId = command.AccountId,
            Amount = command.Amount,
            Category = command.Category,
            Note = command.Note,
            IsArchived = false,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.RecurringExpenses.Add(recurringExpense);

        await context.SaveChangesAsync(cancellationToken);

        return recurringExpense.Id;
    }
}