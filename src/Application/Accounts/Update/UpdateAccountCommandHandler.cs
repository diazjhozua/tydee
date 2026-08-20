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
        account.Type = command.Type;
        account.Icon = command.Icon;
        account.Color = command.Color;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
