using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Shouldly;
using Web.Api.Extensions;
using Xunit;

namespace Tests;

// Runs the real /health mapping in an in-memory server. The fake database check fails with an
// exception that names an internal host; anonymous callers must never see that text or the check name.
public class HealthCheckEndpointTests
{
    private const string InternalHost = "db.internal.example";
    private const string CheckName = "npgsql";

    private static async Task<WebApplication> StartAsync(Func<HealthCheckResult> check)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddHealthChecks().AddCheck(CheckName, check);

        WebApplication app = builder.Build();
        app.MapHealthEndpoint();

        await app.StartAsync();

        return app;
    }

    private static HttpClient Client(WebApplication app) =>
        ((TestServer)app.Services.GetRequiredService<IServer>()).CreateClient();

    [Fact]
    public async Task Failing_check_returns_503_with_aggregate_status_only()
    {
        await using WebApplication app = await StartAsync(() => HealthCheckResult.Unhealthy(
            "database unreachable",
            new InvalidOperationException($"Failed to connect to {InternalHost}:5432")));
        HttpClient client = Client(app);

        using HttpResponseMessage response = await client.GetAsync("/health");
        string body = await response.Content.ReadAsStringAsync();

        response.StatusCode.ShouldBe(HttpStatusCode.ServiceUnavailable);
        body.ShouldBe("Unhealthy");
        body.ShouldNotContain(InternalHost);
        body.ShouldNotContain("5432");
        body.ShouldNotContain(CheckName);
    }

    [Fact]
    public async Task Healthy_check_returns_200()
    {
        await using WebApplication app = await StartAsync(() => HealthCheckResult.Healthy());
        HttpClient client = Client(app);

        using HttpResponseMessage response = await client.GetAsync("/health");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).ShouldBe("Healthy");
    }
}
