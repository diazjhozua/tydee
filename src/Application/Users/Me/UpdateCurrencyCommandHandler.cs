using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Me;

internal sealed class UpdateCurrencyCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateCurrencyCommand>
{
    public async Task<Result> Handle(UpdateCurrencyCommand command, CancellationToken cancellationToken)
    {
        User? user = await context.Users.SingleOrDefaultAsync(
            u => u.Id == command.UserId, cancellationToken);

        if (user is null)
        {
            return Result.Failure(Error.NotFound("Users.NotFound", "The user was not found."));
        }

        user.Currency = command.Currency.ToUpperInvariant();

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
