namespace Domain.Users;

public enum PendingEmailKind
{
    PasswordReset,
    VerificationResend,
}

/// <summary>
/// An account email waiting for the worker. Every request is queued, for known and unknown addresses alike, so
/// the request path does the same work either way. The worker looks up the account, makes the token, and sends
/// the email. It deletes the row once the email is sent, or once no email is needed.
/// </summary>
public sealed class PendingEmail
{
    public Guid Id { get; set; }

    public PendingEmailKind Kind { get; set; }

    public string Email { get; set; } = string.Empty;

    public DateTime RequestedOnUtc { get; set; }

    /// <summary>The earliest time the worker may try this request. Pushed back after each failed send.</summary>
    public DateTime NextAttemptOnUtc { get; set; }

    public int Attempts { get; set; }

    /// <summary>Resend only: hash of the browser secret the account is bound to once a code is issued.</summary>
    public string? SessionHash { get; set; }

    /// <summary>Resend only: hash of the secret the requesting browser presented, or null when it had none.</summary>
    public string? PresentedSessionHash { get; set; }

    public static PendingEmail Request(
        PendingEmailKind kind,
        string email,
        DateTime utcNow,
        string? sessionHash = null,
        string? presentedSessionHash = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Kind = kind,
            Email = email.ToLowerInvariant(),
            RequestedOnUtc = utcNow,
            NextAttemptOnUtc = utcNow,
            SessionHash = sessionHash,
            PresentedSessionHash = presentedSessionHash,
        };
}
