using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Application.Abstractions.Verification;

namespace Infrastructure.Verification;

internal sealed class VerificationSecrets(EmailVerificationSettings settings) : IVerificationSecrets
{
    public string NewCode()
    {
        int value = RandomNumberGenerator.GetInt32(0, 1_000_000);

        return value.ToString("D6", CultureInfo.InvariantCulture);
    }

    public string NewSessionSecret() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    public string HashSessionSecret(string sessionSecret) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(sessionSecret)));

    public string HashCode(Guid userId, string code)
    {
        // Bound to the user id, so the same code gives a different hash on another account.
        byte[] message = Encoding.UTF8.GetBytes($"{userId:D}:{code}");
        byte[] key = Encoding.UTF8.GetBytes(settings.CodeSecret);

        return Convert.ToBase64String(HMACSHA256.HashData(key, message));
    }

    public bool CodeMatches(Guid userId, string code, string codeHash)
    {
        byte[] expected = Encoding.UTF8.GetBytes(HashCode(userId, code));
        byte[] actual = Encoding.UTF8.GetBytes(codeHash);

        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}
