using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Domain.CardPayments;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.CardPayments.Create;

internal sealed class CreateCardPaymentCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateCardPaymentCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateCardPaymentCommand command, CancellationToken cancellationToken)
    {
        if (command.FromAccountId == command.CardAccountId)
        {
            return Result.Failure<Guid>(CardPaymentErrors.SameAccount);
        }

        List<Account> accounts = await context.Accounts
            .Where(a => a.UserId == command.UserId &&
                        (a.Id == command.FromAccountId || a.Id == command.CardAccountId))
            .ToListAsync(cancellationToken);

        if (accounts.Count != 2)
        {
            return Result.Failure<Guid>(AccountErrors.NotFound);
        }

        if (accounts.Any(a => a.IsArchived))
        {
            return Result.Failure<Guid>(AccountErrors.Archived);
        }

        Account card = accounts.Single(a => a.Id == command.CardAccountId);
        Account source = accounts.Single(a => a.Id == command.FromAccountId);

        if (card.Type != AccountType.CreditCard)
        {
            return Result.Failure<Guid>(CardPaymentErrors.NotCreditCard);
        }

        if (source.Type == AccountType.CreditCard)
        {
            return Result.Failure<Guid>(CardPaymentErrors.SourceIsCreditCard);
        }

        var payment = new CardPayment
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            FromAccountId = command.FromAccountId,
            CardAccountId = command.CardAccountId,
            Amount = command.Amount,
            Date = command.Date,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.CardPayments.Add(payment);

        await context.SaveChangesAsync(cancellationToken);

        return payment.Id;
    }
}
