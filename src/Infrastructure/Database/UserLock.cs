using Application.Abstractions.Data;
using Microsoft.EntityFrameworkCore.Storage;

namespace Infrastructure.Database;

internal sealed class UserLock(IDbContextTransaction? transaction) : IUserLock
{
    /// <summary>
    /// Holds nothing. Used when the provider has no transactions, which is the
    /// in-memory provider the unit tests run on.
    /// </summary>
    public static IUserLock None { get; } = new UserLock(null);

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
