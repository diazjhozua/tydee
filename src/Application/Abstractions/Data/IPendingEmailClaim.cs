using Domain.Users;

namespace Application.Abstractions.Data;

/// <summary>
/// One pending account email, claimed for processing. Other workers skip a claimed row until this claim ends.
/// Changes made while it is held are written only by <see cref="CommitAsync"/>. Disposing without committing
/// rolls them back, so the row stays queued.
/// </summary>
public interface IPendingEmailClaim : IAsyncDisposable
{
    /// <summary>The claimed request, or null when nothing is due.</summary>
    PendingEmail? Request { get; }

    Task CommitAsync(CancellationToken cancellationToken = default);
}
