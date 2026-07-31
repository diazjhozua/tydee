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
    public string Currency { get; set; } = "PHP";
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    public List<RefreshToken> RefreshTokens { get; } = [];
}
