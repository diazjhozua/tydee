using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Primitives;
using Shouldly;
using Web.Api.Extensions;
using Web.Api.Infrastructure;
using Xunit;

namespace Tests;

// Runs the real client-address middleware and the auth rate limiter in an in-memory server.
// The test sets the peer address per request through X-Test-Peer. No database is involved.
public class ClientAddressRateLimitTests
{
    private const string PeerHeader = "X-Test-Peer";
    private const string Probe = "/probe";

    private static async Task<WebApplication> StartAsync()
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ClientAddress:TrustedNetworks:0"] = "172.16.0.0/12",
            ["RateLimiting:Auth:PermitLimit"] = "10",
            ["RateLimiting:Auth:WindowInSeconds"] = "60",
        });
        builder.Services.AddClientAddress(builder.Configuration);
        builder.Services.AddRateLimitingInternal(builder.Configuration);

        WebApplication app = builder.Build();

        app.Use(async (context, next) =>
        {
            if (context.Request.Headers.TryGetValue(PeerHeader, out StringValues peer))
            {
                context.Connection.RemoteIpAddress = IPAddress.Parse(peer!);
            }

            await next(context);
        });
        app.UseClientAddressRateLimiting();
        app.MapGet(Probe, () => Results.Ok()).RequireRateLimiting(RateLimitingExtensions.AuthPolicy);

        await app.StartAsync();

        return app;
    }

    private static HttpClient Client(WebApplication app) =>
        ((TestServer)app.Services.GetRequiredService<IServer>()).CreateClient();

    private static async Task<HttpStatusCode> SendAsync(HttpClient client, string peer, string clientAddress)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, Probe);
        request.Headers.Add(PeerHeader, peer);
        request.Headers.Add(ClientAddressSettings.HeaderName, clientAddress);

        using HttpResponseMessage response = await client.SendAsync(request);

        return response.StatusCode;
    }

    [Fact]
    public async Task Trusted_peer_counts_each_forwarded_client_separately()
    {
        await using WebApplication app = await StartAsync();
        HttpClient client = Client(app);

        for (int i = 0; i < 10; i++)
        {
            (await SendAsync(client, "172.18.0.2", "203.0.113.10")).ShouldBe(HttpStatusCode.OK);
        }

        (await SendAsync(client, "172.18.0.2", "203.0.113.10")).ShouldBe(HttpStatusCode.TooManyRequests);
        (await SendAsync(client, "172.18.0.2", "203.0.113.11")).ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Untrusted_peer_cannot_pick_its_own_bucket_with_a_fake_header()
    {
        await using WebApplication app = await StartAsync();
        HttpClient client = Client(app);

        for (int i = 0; i < 10; i++)
        {
            (await SendAsync(client, "203.0.113.9", $"198.51.100.{i}")).ShouldBe(HttpStatusCode.OK);
        }

        (await SendAsync(client, "203.0.113.9", "198.51.100.200")).ShouldBe(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Invalid_header_from_a_trusted_peer_is_counted_against_the_peer()
    {
        await using WebApplication app = await StartAsync();
        HttpClient client = Client(app);

        for (int i = 0; i < 10; i++)
        {
            (await SendAsync(client, "172.18.0.2", "not-an-ip")).ShouldBe(HttpStatusCode.OK);
        }

        (await SendAsync(client, "172.18.0.2", "198.51.100.1:443")).ShouldBe(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Mapped_ipv6_peer_in_the_trusted_range_uses_the_forwarded_client()
    {
        await using WebApplication app = await StartAsync();
        HttpClient client = Client(app);

        for (int i = 0; i < 10; i++)
        {
            (await SendAsync(client, "::ffff:172.18.0.2", "203.0.113.10")).ShouldBe(HttpStatusCode.OK);
        }

        (await SendAsync(client, "::ffff:172.18.0.2", "203.0.113.10")).ShouldBe(HttpStatusCode.TooManyRequests);
        (await SendAsync(client, "::ffff:172.18.0.2", "203.0.113.11")).ShouldBe(HttpStatusCode.OK);
    }
}
