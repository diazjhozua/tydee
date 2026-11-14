using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.CardPayments;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.CardPayments.Delete;

internal sealed class DeleteCardPaymentCommandHandler(IApplicationDbContext context)
    : ICommandHandler<DeleteCardPaymentCommand>
{
    public async Task<Result> Handle(DeleteCardPaymentCommand command, CancellationToken cancellationToken)
    {
        CardPayment? payment = await context.CardPayments.SingleOrDefaultAsync(
            p => p.Id == command.PaymentId && p.UserId == command.UserId,
            cancellationToken);

        if (payment is null)
        {
            return Result.Failure(CardPaymentErrors.NotFound);
        }

        Account? card = await context.Accounts.SingleOrDefaultAsync(
            a => a.Id == payment.CardAccountId && a.UserId == command.UserId,
            cancellationToken);

        if (card?.IsArchived == true)
        {
            return Result.Failure(AccountErrors.Archived);
        }

        context.CardPayments.Remove(payment);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
