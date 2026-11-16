using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.Extensions.Configuration;
using Shouldly;
using Web.Api.Infrastructure;
using Xunit;

namespace Tests;

public class LoginAttemptLimiterTests
{
    private static LoginAttemptLimiter Limiter(int permitLimit) =>
        new(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimiting:User:PermitLimit"] = permitLimit.ToString(CultureInfo.InvariantCulture),
                ["RateLimiting:User:WindowInSeconds"] = "60",
            })
            .Build());

    private static bool Acquire(LoginAttemptLimiter limiter, string email)
    {
        using RateLimitLease lease = limiter.Acquire(email);

        return lease.IsAcquired;
    }

    [Fact]
    public void Attempts_past_the_budget_are_refused_for_one_email()
    {
        using var limiter = Limiter(permitLimit: 3);

        Acquire(limiter, "owner@example.com").ShouldBeTrue();
        Acquire(limiter, "owner@example.com").ShouldBeTrue();
        Acquire(limiter, "owner@example.com").ShouldBeTrue();
        Acquire(limiter, "owner@example.com").ShouldBeFalse();
    }

    [Fact]
    public void Other_emails_keep_their_own_budget()
    {
        using var limiter = Limiter(permitLimit: 1);

        Acquire(limiter, "owner@example.com").ShouldBeTrue();
        Acquire(limiter, "other@example.com").ShouldBeTrue();
    }

    [Fact]
    public void Email_case_shares_one_budget()
    {
        using var limiter = Limiter(permitLimit: 1);

        Acquire(limiter, "Owner@Example.com").ShouldBeTrue();
        Acquire(limiter, "owner@example.com").ShouldBeFalse();
    }
}
