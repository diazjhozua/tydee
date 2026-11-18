using Microsoft.Extensions.Primitives;
using Web.Api.Infrastructure;

namespace Web.Api.Middleware;

// Replaces the connection's remote address with the visitor's address before the rate limiters
// read it. Must run before UseRateLimiter.
public class ClientAddressMiddleware(RequestDelegate next, ClientAddressSettings settings)
{
    public Task Invoke(HttpContext context)
    {
        StringValues header = context.Request.Headers[ClientAddressSettings.HeaderName];

        context.Connection.RemoteIpAddress = settings.Resolve(
            context.Connection.RemoteIpAddress,
            header.FirstOrDefault());

        return next(context);
    }
}
