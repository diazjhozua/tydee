using Application.Abstractions.Data;
using Domain.Users;
using Microsoft.EntityFrameworkCore.Storage;

namespace Infrastructure.Database;

internal sealed class PendingEmailClaim(
    PendingEmail? request,
    IDbContextTransaction? transaction)
    : IPendingEmailClaim
{
    public PendingEmail? Request { get; } = request;

    public async Task CommitAsync(CancellationToken cancellationToken = default)
    {
        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (transaction is not null)
        {
            await transaction.DisposeAsync();
        }
    }
}
