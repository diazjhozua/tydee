using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Expenses;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Expenses.Delete;

internal sealed class DeleteExpenseCommandHandler(IApplicationDbContext context)
    : ICommandHandler<DeleteExpenseCommand>
{
    public async Task<Result> Handle(DeleteExpenseCommand command, CancellationToken cancellationToken)
    {
        Expense? expense = await context.Expenses.SingleOrDefaultAsync(
            e => e.Id == command.ExpenseId && e.UserId == command.UserId,
            cancellationToken);

        if (expense is null)
        {
            return Result.Failure(ExpenseErrors.NotFound);
        }

        context.Expenses.Remove(expense);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
