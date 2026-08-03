using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.Expenses;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Expenses.Update;

internal sealed class UpdateExpenseCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateExpenseCommand>
{
    public async Task<Result> Handle(UpdateExpenseCommand command, CancellationToken cancellationToken)
    {
        Expense? expense = await context.Expenses.SingleOrDefaultAsync(
            e => e.Id == command.ExpenseId && e.UserId == command.UserId,
            cancellationToken);

        if (expense is null)
        {
            return Result.Failure(ExpenseErrors.NotFound);
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

        expense.AccountId = command.AccountId;
        expense.Amount = command.Amount;
        expense.Note = command.Note;
        expense.Category = command.Category;
        expense.Date = command.Date;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
