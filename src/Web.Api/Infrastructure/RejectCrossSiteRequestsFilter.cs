using SharedKernel;

namespace Web.Api.Infrastructure;

// Refuses a request a browser sent from another site, before the handler runs. Two browser signals are checked:
// Sec-Fetch-Site, which a browser sets on every request, and Origin, which a browser sends on cross-site POSTs and
// form submissions. An Origin that is not in Cors:AllowedOrigins is refused, so the same list that already controls
// browser CORS also controls these writes. A missing header (older browsers, non-browser clients) is allowed.
public sealed class RejectCrossSiteRequestsFilter(IConfiguration configuration) : IEndpointFilter
{
    private readonly string[] _allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        if (IsCrossSite(context.HttpContext.Request))
        {
            return ValueTask.FromResult<object?>(CustomResults.Problem(Result.Failure(Error.Forbidden(
                "Users.CrossSiteRequest",
                "Cross-site requests are refused."))));
        }

        return next(context);
    }

    private bool IsCrossSite(HttpRequest request)
    {
        string fetchSite = request.Headers["Sec-Fetch-Site"].ToString();

        if (string.Equals(fetchSite, "cross-site", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // "null" (sandboxed frames and some redirects) is not in the list, so it is refused too.
        string origin = request.Headers["Origin"].ToString();

        return origin.Length > 0 && !_allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
    }
}
