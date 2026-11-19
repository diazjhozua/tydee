using Application.Abstractions.Authentication;
using Application.Abstractions.Email;
using Domain.Users;
using SharedKernel;

namespace Tests.TestInfrastructure;

internal sealed class FakePasswordHasher : IPasswordHasher
{
    public int HashCalls { get; private set; }

    public int VerifyCalls { get; private set; }

    public string Hash(string password)
    {
        HashCalls++;

        return $"#{password}";
    }

    public bool Verify(string password, string passwordHash)
    {
        VerifyCalls++;

        return passwordHash == $"#{password}";
    }
}

internal sealed class FakeTokenProvider : ITokenProvider
{
    private int _counter;

    public string CreateAccessToken(User user) => $"access-{user.Id}";

    public string GenerateRefreshToken() => $"raw-{++_counter}";

    public string HashRefreshToken(string rawToken) => $"h:{rawToken}";
}

internal sealed class FakeAdminProvider : IAdminProvider
{
    private readonly HashSet<string> _emails;

    public FakeAdminProvider(params string[] emails) =>
        _emails = new HashSet<string>(emails, StringComparer.OrdinalIgnoreCase);

    public bool IsAdmin(string email) => _emails.Contains(email);
}

internal sealed class FixedDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow { get; set; } = new(2026, 8, 6, 12, 0, 0, DateTimeKind.Utc);
}

internal sealed class FakeEmailSender : IEmailSender
{
    public int VerificationEmailsSent { get; private set; }

    public int AlreadyRegisteredEmailsSent { get; private set; }

    public List<string> VerificationRecipients { get; } = [];

    public List<string> PasswordResetRecipients { get; } = [];

    public bool FailPasswordResetSends { get; set; }

    public Task SendEmailVerificationAsync(
        string toEmail, string verificationToken, CancellationToken cancellationToken = default)
    {
        VerificationEmailsSent++;
        VerificationRecipients.Add(toEmail);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(
        string toEmail, string resetToken, CancellationToken cancellationToken = default)
    {
        if (FailPasswordResetSends)
        {
            throw new InvalidOperationException("SMTP is down.");
        }

        PasswordResetRecipients.Add(toEmail);
        return Task.CompletedTask;
    }

    public Task SendAlreadyRegisteredAsync(string toEmail, CancellationToken cancellationToken = default)
    {
        AlreadyRegisteredEmailsSent++;
        return Task.CompletedTask;
    }
}
