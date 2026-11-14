using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.Update;

internal sealed class UpdateAccountCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateAccountCommand>
{
    public async Task<Result> Handle(UpdateAccountCommand command, CancellationToken cancellationToken)
    {
        Result<AccountType> type = AccountTypeParser.Parse(command.Type);

        if (type.IsFailure)
        {
            return Result.Failure(type.Error);
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

        // Covers both a switch to CreditCard and an existing card whose stored percent is nonzero.
        if (type.Value == AccountType.CreditCard && account.AllocationPercent != 0m)
        {
            return Result.Failure(AllocationErrors.CreditCardNotAllocatable);
        }

        // Only a switch to CreditCard is blocked; an existing card can still be renamed.
        if (type.Value == AccountType.CreditCard &&
            account.Type != AccountType.CreditCard &&
            await context.IncomeAllocations.AnyAsync(a => a.AccountId == command.AccountId, cancellationToken))
        {
            return Result.Failure(AllocationErrors.CreditCardHasAllocations);
        }

        bool nameTaken = await context.Accounts.AnyAsync(
            a => a.UserId == command.UserId &&
                 a.Name == command.Name &&
                 !a.IsArchived &&
                 a.Id != command.AccountId,
            cancellationToken);

        if (nameTaken)
        {
            return Result.Failure(AccountErrors.NameTaken);
        }

        account.Name = command.Name;
        account.Type = type.Value;
        account.Icon = command.Icon;
        account.Color = command.Color;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
