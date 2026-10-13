using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.RecurringExpenses;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.RecurringExpenses.Update;

internal sealed class UpdateRecurringExpenseCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateRecurringExpenseCommand>
{
    public async Task<Result> Handle(UpdateRecurringExpenseCommand command, CancellationToken cancellationToken)
    {
        RecurringExpense? recurringExpense = await context.RecurringExpenses.SingleOrDefaultAsync(
            r => r.Id == command.RecurringExpenseId && r.UserId == command.UserId,
            cancellationToken);

        if (recurringExpense is null)
        {
            return Result.Failure(RecurringExpenseErrors.NotFound);
        }

        if (recurringExpense.IsArchived)
        {
            return Result.Failure(RecurringExpenseErrors.Archived);
        }

        Account? account = await context.Accounts.SingleOrDefaultAsync(
            a => a.Id == command.AccountId && a.UserId == command.UserId,
            cancellationToken);

        if (account is null)
        {
            return Result.Failure(AccountErrors.NotFound);
        }

        if (account.IsArchived)
        {
            return Result.Failure(AccountErrors.Archived);
        }

        recurringExpense.Name = command.Name;
        recurringExpense.AccountId = command.AccountId;
        recurringExpense.Amount = command.Amount;
        recurringExpense.Category = command.Category;
        recurringExpense.Note = command.Note;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}