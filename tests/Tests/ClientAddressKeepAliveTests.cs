using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Shouldly;
using Web.Api.Extensions;
using Web.Api.Infrastructure;
using Xunit;

namespace Tests;

// Uses a real Kestrel server on loopback and sends two requests over one pooled connection.
// The API's upstreams (Traefik and the BFF) reuse connections, so a client address set by one
// request must not carry over to the next request on the same connection.
public class ClientAddressKeepAliveTests
{
    [Fact]
    public async Task Request_without_header_on_a_reused_connection_is_not_counted_under_the_previous_visitor()
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            // Loopback is trusted, so the header is honored for the test client.
            ["ClientAddress:TrustedNetworks:0"] = "127.0.0.0/8",
        });
        builder.Services.AddClientAddress(builder.Configuration);
        builder.Services.AddRateLimitingInternal(builder.Configuration);

        await using WebApplication app = builder.Build();
        app.UseClientAddressRateLimiting();
        // Echoes the address the rate limiter would count, and the client's TCP port, so the test can
        // prove both requests used the same connection.
        app.MapGet("/whoami", (HttpContext context) =>
            $"{context.Connection.RemoteIpAddress} {context.Connection.RemotePort}");
        await app.StartAsync();

        using var handler = new SocketsHttpHandler
        {
            MaxConnectionsPerServer = 1,
            PooledConnectionLifetime = Timeout.InfiniteTimeSpan,
        };
        using var client = new HttpClient(handler) { BaseAddress = new Uri(app.Urls.First()) };

        string first = await WhoAmI(client, "203.0.113.10");
        string second = await WhoAmI(client, null);

        first.Split(' ')[1].ShouldBe(second.Split(' ')[1], "both requests must share one connection");
        first.Split(' ')[0].ShouldBe("203.0.113.10");
        second.Split(' ')[0].ShouldBe("127.0.0.1");
    }

    private static async Task<string> WhoAmI(HttpClient client, string? clientAddress)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");

        if (clientAddress is not null)
        {
            request.Headers.Add(ClientAddressSettings.HeaderName, clientAddress);
        }

        using HttpResponseMessage response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync();
    }
}
