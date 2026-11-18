using System.Net;

namespace Web.Api.Infrastructure;

// Decides which address the rate limiters count. Behind Cloudflare Tunnel every request reaches
// the API from the proxy's address, so the visitor's address is read from CF-Connecting-IP, and
// only when the request comes from a trusted network. Cloudflare overwrites that header on every
// request, so a visitor cannot set it from outside.
public sealed class ClientAddressSettings
{
    public const string HeaderName = "CF-Connecting-IP";

    private readonly IReadOnlyList<IPNetwork> _trustedNetworks;

    private ClientAddressSettings(IReadOnlyList<IPNetwork> trustedNetworks)
    {
        _trustedNetworks = trustedNetworks;
    }

    public static ClientAddressSettings FromConfiguration(IConfiguration configuration)
    {
        string[] entries = configuration.GetSection("ClientAddress:TrustedNetworks").Get<string[]>() ?? [];
        List<IPNetwork> networks = [];

        foreach (string entry in entries)
        {
            if (!IPNetwork.TryParse(entry, out IPNetwork network))
            {
                throw new InvalidOperationException(
                    $"ClientAddress:TrustedNetworks contains an invalid network: '{entry}'.");
            }

            networks.Add(network);
        }

        return new ClientAddressSettings(networks);
    }

    // Returns the address the rate limiters should count. Falls back to the peer when the peer is
    // not trusted, or when the header is missing or is not a single IP address.
    public IPAddress? Resolve(IPAddress? peer, string? headerValue)
    {
        if (peer is null || !IsTrusted(peer))
        {
            return peer;
        }

        if (!IPAddress.TryParse(headerValue?.Trim(), out IPAddress? client))
        {
            return peer;
        }

        return client;
    }

    private bool IsTrusted(IPAddress address)
    {
        IPAddress candidate = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;

        return _trustedNetworks.Any(network => network.Contains(candidate));
    }
}
