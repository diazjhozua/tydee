namespace Application.Abstractions.Verification;

/// <summary>
/// Makes and checks the email verification secrets. The code is keyed with a server secret, so reading the
/// database alone can't recover it. The browser secret is random, and only its SHA-256 is stored.
/// </summary>
public interface IVerificationSecrets
{
    /// <summary>A six-digit code, zero-padded.</summary>
    string NewCode();

    /// <summary>A random browser secret. It goes to the browser once and is never stored in clear.</summary>
    string NewSessionSecret();

    string HashSessionSecret(string sessionSecret);

    string HashCode(Guid userId, string code);

    /// <summary>Compares <paramref name="code"/> with a stored <paramref name="codeHash"/> in constant time.</summary>
    bool CodeMatches(Guid userId, string code, string codeHash);
}
