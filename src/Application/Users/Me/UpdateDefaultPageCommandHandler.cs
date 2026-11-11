using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Me;

internal sealed class UpdateDefaultPageCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateDefaultPageCommand>
{
    public async Task<Result> Handle(UpdateDefaultPageCommand command, CancellationToken cancellationToken)
    {
        User? user = await context.Users.SingleOrDefaultAsync(
            u => u.Id == command.UserId, cancellationToken);

        if (user is null)
        {
            return Result.Failure(UserErrors.NotFound);
        }

        user.DefaultPage = DefaultPages.Normalize(command.DefaultPage);

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
