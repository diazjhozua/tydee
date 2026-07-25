using System.Text;
using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Email;
using Infrastructure.Authentication;
using Infrastructure.Database;
using Infrastructure.DomainEvents;
using Infrastructure.Email;
using Infrastructure.Time;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SharedKernel;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration) =>
        services
            .AddServices()
            .AddDatabase(configuration)
            .AddHealthChecksInternal(configuration)
            .AddAuthenticationInternal(configuration)
            .AddEmail(configuration)
            .AddAuthorizationInternal();

    private static IServiceCollection AddServices(this IServiceCollection services)
    {
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();

        services.AddTransient<IDomainEventsDispatcher, DomainEventsDispatcher>();

        return services;
    }

    private static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        string? connectionString = configuration.GetConnectionString("Database");

        services.AddDbContext<ApplicationDbContext>(
            options => options
                .UseNpgsql(connectionString, npgsqlOptions =>
                    npgsqlOptions.MigrationsHistoryTable(HistoryRepository.DefaultTableName, Schemas.Default))
                .UseSnakeCaseNamingConvention());

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        return services;
    }

    private static IServiceCollection AddHealthChecksInternal(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddHealthChecks()
            .AddNpgSql(configuration.GetConnectionString("Database")!);

        return services;
    }

    private static IServiceCollection AddAuthenticationInternal(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        JwtSettings jwtSettings = configuration
            .GetSection(JwtSettings.SectionName)
            .Get<JwtSettings>()
            ?? throw new InvalidOperationException("Jwt configuration section is missing.");

        services.AddSingleton(jwtSettings);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.RequireHttpsMetadata = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    ClockSkew = TimeSpan.Zero,
                };
            });

        services.AddHttpContextAccessor();
        services.AddScoped<IUserContext, UserContext>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenProvider, TokenProvider>();

        return services;
    }

    private static IServiceCollection AddEmail(this IServiceCollection services, IConfiguration configuration)
    {
        SmtpSettings smtpSettings = configuration
            .GetSection(SmtpSettings.SectionName)
            .Get<SmtpSettings>()
            ?? throw new InvalidOperationException("Smtp configuration section is missing.");

        services.AddSingleton(smtpSettings);
        services.AddTransient<IEmailSender, SmtpEmailSender>();

        return services;
    }

    private static IServiceCollection AddAuthorizationInternal(this IServiceCollection services)
    {
        services.AddAuthorization();

        return services;
    }
}
