namespace Application.Abstractions.Data;

/// <summary>
/// A row lock on one user, held inside a transaction. Changes made while it is held
/// are written only by <see cref="CommitAsync"/>. Disposing without committing
/// rolls them back.
/// </summary>
public interface IUserLock : IAsyncDisposable
{
    Task CommitAsync(CancellationToken cancellationToken = default);
}
