using Application.Abstractions.Authentication;
using Domain.Users;
using SharedKernel;

namespace Tests.TestInfrastructure;

internal sealed class FakePasswordHasher : IPasswordHasher
{
    public string Hash(string password) => $"#{password}";

    public bool Verify(string password, string passwordHash) => passwordHash == $"#{password}";
}

internal sealed class FakeTokenProvider : ITokenProvider
{
    private int _counter;

    public string CreateAccessToken(User user) => $"access-{user.Id}";

    public string GenerateRefreshToken() => $"raw-{++_counter}";

    public string HashRefreshToken(string rawToken) => $"h:{rawToken}";
}

internal sealed class FixedDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow { get; set; } = new(2026, 8, 6, 12, 0, 0, DateTimeKind.Utc);
}
