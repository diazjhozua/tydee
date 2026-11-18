using Web.Api.Infrastructure;
using Web.Api.Middleware;

namespace Web.Api.Extensions;

public static class MiddlewareExtensions
{
    public static IApplicationBuilder UseRequestContextLogging(this IApplicationBuilder app)
    {
        app.UseMiddleware<RequestContextLoggingMiddleware>();

        return app;
    }

    public static IServiceCollection AddClientAddress(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton(ClientAddressSettings.FromConfiguration(configuration));

        return services;
    }

    public static IApplicationBuilder UseClientAddress(this IApplicationBuilder app)
    {
        app.UseMiddleware<ClientAddressMiddleware>();

        return app;
    }

    // The limiter must count the visitor's address, so the client address step always runs first.
    // Program and the tests both call this, so they cannot drift apart.
    public static IApplicationBuilder UseClientAddressRateLimiting(this IApplicationBuilder app)
    {
        app.UseClientAddress();
        app.UseRateLimiter();

        return app;
    }
}
