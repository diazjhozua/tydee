using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.RecurringExpenses;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.RecurringExpenses.Archive;

internal sealed class ArchiveRecurringExpenseCommandHandler(IApplicationDbContext context)
    : ICommandHandler<ArchiveRecurringExpenseCommand>
{
    public async Task<Result> Handle(ArchiveRecurringExpenseCommand command, CancellationToken cancellationToken)
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

        recurringExpense.IsArchived = true;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}