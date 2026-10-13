using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.Expenses;
using Domain.RecurringExpenses;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Expenses.Create;

internal sealed class CreateExpenseCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateExpenseCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateExpenseCommand command, CancellationToken cancellationToken)
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

        if (command.RecurringExpenseId is not null)
        {
            bool templateExists = await context.RecurringExpenses.AnyAsync(
                r => r.Id == command.RecurringExpenseId && r.UserId == command.UserId,
                cancellationToken);

            if (!templateExists)
            {
                return Result.Failure<Guid>(RecurringExpenseErrors.NotFound);
            }
        }

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            AccountId = command.AccountId,
            Amount = command.Amount,
            Note = command.Note,
            Category = command.Category,
            Date = command.Date,
            RecurringExpenseId = command.RecurringExpenseId,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.Expenses.Add(expense);

        await context.SaveChangesAsync(cancellationToken);

        return expense.Id;
    }
}
