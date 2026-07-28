using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Accounts.Create;

internal sealed class CreateAccountCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateAccountCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateAccountCommand command, CancellationToken cancellationToken)
    {
        bool nameTaken = await context.Accounts.AnyAsync(
            a => a.UserId == command.UserId && a.Name == command.Name && !a.IsArchived,
            cancellationToken);

        if (nameTaken)
        {
            return Result.Failure<Guid>(AccountErrors.NameTaken);
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Name = command.Name,
            Type = command.Type,
            AllocationPercent = command.AllocationPercent,
            IsArchived = false,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.Accounts.Add(account);

        await context.SaveChangesAsync(cancellationToken);

        return account.Id;
    }
}
