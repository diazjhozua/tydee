namespace Domain.Users;

public sealed class RefreshToken
{
    public Guid Id { get; set; }

    // SHA-256 hash of the raw token, never the raw value itself.
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public DateTime ExpiresOnUtc { get; set; }
    public DateTime? RevokedAt { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresOnUtc;
    public bool IsActive => RevokedAt is null && !IsExpired;

    public User User { get; set; } = null!;
}
