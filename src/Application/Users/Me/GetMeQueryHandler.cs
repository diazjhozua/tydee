using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Me;

internal sealed class GetMeQueryHandler(IApplicationDbContext context)
    : IQueryHandler<GetMeQuery, MeResult>
{
    public async Task<Result<MeResult>> Handle(GetMeQuery query, CancellationToken cancellationToken)
    {
        MeResult? me = await context.Users
            .Where(u => u.Id == query.UserId)
            .Select(u => new MeResult(u.Id, u.Email, u.FirstName, u.LastName, u.Currency))
            .SingleOrDefaultAsync(cancellationToken);

        return me is not null
            ? me
            : Result.Failure<MeResult>(Error.NotFound("Users.NotFound", "The user was not found."));
    }
}
