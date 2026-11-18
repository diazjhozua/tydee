using System.Net;
using Microsoft.Extensions.Configuration;
using Shouldly;
using Web.Api.Infrastructure;
using Xunit;

namespace Tests;

public class ClientAddressSettingsTests
{
    private static ClientAddressSettings Settings(params string[] trustedNetworks)
    {
        var values = new Dictionary<string, string?>();

        for (int i = 0; i < trustedNetworks.Length; i++)
        {
            values[$"ClientAddress:TrustedNetworks:{i}"] = trustedNetworks[i];
        }

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

        return ClientAddressSettings.FromConfiguration(configuration);
    }

    [Fact]
    public void Header_is_used_when_the_peer_is_in_a_trusted_network()
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(IPAddress.Parse("172.18.0.2"), "203.0.113.7")
            .ShouldBe(IPAddress.Parse("203.0.113.7"));
    }

    [Fact]
    public void Header_is_ignored_when_the_peer_is_not_trusted()
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(IPAddress.Parse("203.0.113.9"), "198.51.100.1")
            .ShouldBe(IPAddress.Parse("203.0.113.9"));
    }

    [Theory]
    [InlineData("not-an-ip")]
    [InlineData("203.0.113.7:443")]
    [InlineData("203.0.113.7, 198.51.100.2")]
    [InlineData("")]
    [InlineData("   ")]
    public void Invalid_header_from_a_trusted_peer_falls_back_to_the_peer(string headerValue)
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(IPAddress.Parse("172.18.0.2"), headerValue)
            .ShouldBe(IPAddress.Parse("172.18.0.2"));
    }

    [Fact]
    public void Missing_header_from_a_trusted_peer_falls_back_to_the_peer()
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(IPAddress.Parse("172.18.0.2"), null)
            .ShouldBe(IPAddress.Parse("172.18.0.2"));
    }

    [Fact]
    public void Surrounding_spaces_in_the_header_are_trimmed()
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(IPAddress.Parse("172.18.0.2"), "  203.0.113.7  ")
            .ShouldBe(IPAddress.Parse("203.0.113.7"));
    }

    [Fact]
    public void IPv4_mapped_ipv6_peer_is_matched_against_the_ipv4_range()
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(IPAddress.Parse("::ffff:172.18.0.2"), "203.0.113.7")
            .ShouldBe(IPAddress.Parse("203.0.113.7"));
    }

    [Fact]
    public void No_trusted_networks_means_the_header_is_never_used()
    {
        ClientAddressSettings settings = Settings();

        settings.Resolve(IPAddress.Parse("172.18.0.2"), "203.0.113.7")
            .ShouldBe(IPAddress.Parse("172.18.0.2"));
    }

    [Fact]
    public void Missing_peer_stays_missing()
    {
        ClientAddressSettings settings = Settings("172.16.0.0/12");

        settings.Resolve(null, "203.0.113.7").ShouldBeNull();
    }

    [Fact]
    public void Invalid_network_in_configuration_fails_at_startup()
    {
        Exception exception = Should.Throw<InvalidOperationException>(() => Settings("not-a-network"));

        exception.Message.ShouldContain("not-a-network");
    }

    // Loads the real committed default so a change to the shipped range is caught here.
    [Theory]
    [InlineData("172.15.255.255", false)]
    [InlineData("172.16.0.1", true)]
    [InlineData("172.31.255.254", true)]
    [InlineData("172.32.0.1", false)]
    [InlineData("203.0.113.9", false)]
    public void Committed_default_trusts_only_the_docker_range(string peer, bool trusted)
    {
        string appSettings = Path.Combine(FindRepositoryRoot(), "src", "Web.Api", "appsettings.json");
        IConfiguration configuration = new ConfigurationBuilder()
            .AddJsonFile(appSettings, optional: false)
            .Build();
        var settings = ClientAddressSettings.FromConfiguration(configuration);

        IPAddress resolved = settings.Resolve(IPAddress.Parse(peer), "198.51.100.1")!;

        (resolved.ToString() == "198.51.100.1").ShouldBe(trusted);
    }

    private static string FindRepositoryRoot()
    {
        string? directory = AppContext.BaseDirectory;

        while (directory is not null && !File.Exists(Path.Combine(directory, "tydee.slnx")))
        {
            directory = Path.GetDirectoryName(directory);
        }

        return directory ?? throw new InvalidOperationException("tydee.slnx was not found above the test output.");
    }
}
