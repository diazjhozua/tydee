namespace Web.Api.Extensions;

public static class HealthCheckExtensions
{
    // Anonymous callers get the aggregate status only: "Healthy" or "Unhealthy" as text, 200 or 503.
    // The default writer omits check names and exception messages, which can name internal hosts.
    public static void MapHealthEndpoint(this WebApplication app)
    {
        app.MapHealthChecks("health");
    }
}
