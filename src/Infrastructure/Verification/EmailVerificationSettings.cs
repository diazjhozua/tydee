namespace Infrastructure.Verification;

public sealed class EmailVerificationSettings
{
    public const string SectionName = "EmailVerification";

    /// <summary>Keys the HMAC of verification codes. Required, at least 32 characters.</summary>
    public string CodeSecret { get; init; } = string.Empty;
}
