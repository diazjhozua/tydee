namespace Domain.Users;

/// <summary>
/// The verification state of an account that has not verified yet: the one-time code and the browser secret
/// allowed to spend it. The registration password waits here as <see cref="PendingPasswordHash"/> and becomes the
/// account's password only when the code is spent from the browser that set it. The row is deleted once the
/// account verifies, resets its password, or is verified by an admin.
/// </summary>
public sealed class EmailVerification
{
    public const int MaxAttempts = 5;

    public static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(15);

    public static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(60);

    public Guid UserId { get; set; }

    /// <summary>SHA-256 of the browser secret that may spend the code. Unique, so a secret finds its row.</summary>
    public string SessionHash { get; set; } = string.Empty;

    /// <summary>Keyed HMAC of the live code. Null when no code is live: spent, or past its attempts.</summary>
    public string? CodeHash { get; set; }

    public DateTime? CodeExpiresOnUtc { get; set; }

    /// <summary>Wrong guesses across every code issued to this account. Never refilled.</summary>
    public int Attempts { get; set; }

    public DateTime? LastIssuedOnUtc { get; set; }

    /// <summary>The registration password. Null once the browser that set it has been replaced.</summary>
    public string? PendingPasswordHash { get; set; }

    public bool IsSpent => Attempts >= MaxAttempts;

    public bool CanSpend(DateTime utcNow) =>
        CodeHash is not null && !IsSpent && CodeExpiresOnUtc > utcNow;

    public bool IsInCooldown(DateTime utcNow) =>
        LastIssuedOnUtc is { } issued && utcNow - issued < ResendCooldown;

    public void Issue(string codeHash, DateTime utcNow)
    {
        CodeHash = codeHash;
        CodeExpiresOnUtc = utcNow.Add(CodeLifetime);
        LastIssuedOnUtc = utcNow;
    }

    /// <summary>
    /// Points the row at the browser that asked for the code. The registration password stays only when that
    /// browser is the one that already held it; otherwise it is dropped, so the account can't verify with it.
    /// </summary>
    public void Bind(string sessionHash, bool keepPendingPassword)
    {
        SessionHash = sessionHash;

        if (!keepPendingPassword)
        {
            PendingPasswordHash = null;
        }
    }

    /// <summary>Counts a wrong guess. The fifth one ends the live code, and nothing issues another.</summary>
    public void RecordWrongCode()
    {
        Attempts++;

        if (IsSpent)
        {
            CodeHash = null;
        }
    }
}
