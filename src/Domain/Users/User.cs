using SharedKernel;

namespace Domain.Users;

public sealed class User : Entity
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public bool IsAdmin { get; set; }
    public string Currency { get; set; } = "PHP";
    public string? DefaultPage { get; set; }
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; set; }
    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetTokenExpiresAt { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    public List<RefreshToken> RefreshTokens { get; } = [];

    /// <summary>
    /// Revokes every refresh token that is still active at <paramref name="utcNow"/>.
    /// Used when an admin locks the account, on password reset, and on token reuse.
    /// </summary>
    public void RevokeActiveSessions(DateTime utcNow)
    {
        foreach (RefreshToken token in RefreshTokens)
        {
            if (token.IsActive(utcNow))
            {
                token.RevokedAt = utcNow;
            }
        }
    }
}

public static class DefaultPages
{
    public const string Home = "Home";
    public const string LogExpense = "LogExpense";

    public static readonly string[] All = [Home, LogExpense];

    public static bool IsValid(string value) =>
        All.Any(page => string.Equals(page, value, StringComparison.OrdinalIgnoreCase));

    public static string Normalize(string value) =>
        string.Equals(value, LogExpense, StringComparison.OrdinalIgnoreCase) ? LogExpense : Home;
}
