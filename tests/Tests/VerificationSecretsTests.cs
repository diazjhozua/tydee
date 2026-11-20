using Infrastructure.Authentication;
using Infrastructure.Verification;
using Shouldly;
using Xunit;

namespace Tests;

public class VerificationSecretsTests
{
    private const string Key = "test-verification-code-secret-32-chars-min";

    private static VerificationSecrets Secrets(string key = Key) =>
        new(new EmailVerificationSettings { CodeSecret = key });

    [Fact]
    public void New_codes_are_always_six_digits()
    {
        var secrets = Secrets();

        for (int i = 0; i < 500; i++)
        {
            secrets.NewCode().ShouldMatch("^[0-9]{6}$");
        }
    }

    [Fact]
    public void Session_secrets_differ_between_calls()
    {
        var secrets = Secrets();

        secrets.NewSessionSecret().ShouldNotBe(secrets.NewSessionSecret());
    }

    [Fact]
    public void Session_hash_is_base64_sha256_of_the_secret()
    {
        // Known vector: SHA-256("abc") in base64. Keeps the stored hash format fixed.
        Secrets().HashSessionSecret("abc").ShouldBe("ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=");
    }

    [Fact]
    public void Code_hash_changes_with_the_key()
    {
        var userId = Guid.NewGuid();

        Secrets().HashCode(userId, "123456").ShouldNotBe(Secrets("another-verification-code-secret-32chars").HashCode(userId, "123456"));
    }

    [Fact]
    public void Code_hash_changes_with_the_user()
    {
        var secrets = Secrets();

        secrets.HashCode(Guid.NewGuid(), "123456").ShouldNotBe(secrets.HashCode(Guid.NewGuid(), "123456"));
    }

    [Fact]
    public void Code_matches_only_the_same_code_for_the_same_user()
    {
        var secrets = Secrets();
        var userId = Guid.NewGuid();
        string stored = secrets.HashCode(userId, "123456");

        secrets.CodeMatches(userId, "123456", stored).ShouldBeTrue();
        secrets.CodeMatches(userId, "654321", stored).ShouldBeFalse();
        secrets.CodeMatches(Guid.NewGuid(), "123456", stored).ShouldBeFalse();
    }

    [Fact]
    public void Empty_password_hash_never_verifies()
    {
        // An unverified account whose registration password was dropped stores an empty hash. Login
        // must answer "invalid credentials" for it rather than throw.
        new PasswordHasher().Verify("Password123!", string.Empty).ShouldBeFalse();
    }
}
