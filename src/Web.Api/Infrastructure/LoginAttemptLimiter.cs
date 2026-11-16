using System.Threading.RateLimiting;

namespace Web.Api.Infrastructure;

/// <summary>
/// Per-account login budget. Every attempt for an email takes a permit, right or wrong.
/// It sits beside the per-IP auth policy: that one stops a single client, this one stops
/// many clients aimed at one account. It is in-memory, so each API instance counts on its own.
/// </summary>
public sealed class LoginAttemptLimiter : IDisposable
{
    private readonly PartitionedRateLimiter<string> _limiter;

    public LoginAttemptLimiter(IConfiguration configuration)
    {
        int permitLimit = configuration.GetValue("RateLimiting:User:PermitLimit", 10);
        int windowSeconds = configuration.GetValue("RateLimiting:User:WindowInSeconds", 60);

        _limiter = PartitionedRateLimiter.Create<string, string>(email =>
            RateLimitPartition.GetFixedWindowLimiter(
                email,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = permitLimit,
                    Window = TimeSpan.FromSeconds(windowSeconds),
                }));
    }

    /// <summary>Takes one permit for the account. Dispose the lease when the attempt ends.</summary>
    public RateLimitLease Acquire(string? email) =>
        _limiter.AttemptAcquire((email ?? string.Empty).ToLowerInvariant());

    public void Dispose() => _limiter.Dispose();
}
