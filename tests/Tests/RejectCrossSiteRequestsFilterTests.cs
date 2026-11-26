using System.Net;
using System.Text;
using Application.Abstractions.Messaging;
using Application.Users;
using Application.Users.ForgotPassword;
using Application.Users.Register;
using Application.Users.ResendVerification;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using Shouldly;
using SharedKernel;
using Web.Api.Endpoints;
using Web.Api.Infrastructure;
using Xunit;

namespace Tests;

// Maps one real anonymous auth endpoint in an in-memory server, with a substituted handler behind it. The endpoint
// classes are internal, so they are created by reflection. Mapping every endpoint would need services this host does
// not register.
public class RejectCrossSiteRequestsFilterTests
{
    private const string AllowedOrigin = "https://tydee.example.com";
    private const string EmailBody = "{\"email\":\"owner@example.com\"}";
    private const string RegisterBody =
        "{\"email\":\"owner@example.com\",\"password\":\"secret-password\",\"confirmPassword\":\"secret-password\"," +
        "\"firstName\":\"Ada\",\"lastName\":\"Lovelace\"}";

    public static TheoryData<string> Routes => new("ForgotPassword", "ResendVerification", "Register");

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task Cross_site_request_is_refused_with_403_and_never_reaches_the_handler(string name)
    {
        AuthRoute route = RouteFor(name);
        object handler = route.CreateHandler();
        await using WebApplication app = await StartAsync(route, handler);

        using HttpResponseMessage response = await PostAsync(Client(app), route, Headers(("Sec-Fetch-Site", "cross-site")));
        string body = await response.Content.ReadAsStringAsync();

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        body.ShouldContain("Users.CrossSiteRequest");
        handler.ReceivedCalls().ShouldBeEmpty();
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task Cross_site_request_is_refused_even_from_an_allowed_origin(string name)
    {
        AuthRoute route = RouteFor(name);
        object handler = route.CreateHandler();
        await using WebApplication app = await StartAsync(route, handler);

        using HttpResponseMessage response = await PostAsync(Client(app), route, Headers(
            ("Sec-Fetch-Site", "cross-site"),
            ("Origin", AllowedOrigin)));

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        handler.ReceivedCalls().ShouldBeEmpty();
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task Origin_outside_the_allow_list_is_refused_with_403(string name)
    {
        AuthRoute route = RouteFor(name);
        object handler = route.CreateHandler();
        await using WebApplication app = await StartAsync(route, handler);

        using HttpResponseMessage response = await PostAsync(Client(app), route, Headers(
            ("Sec-Fetch-Site", "same-site"),
            ("Origin", "https://evil.example")));

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        handler.ReceivedCalls().ShouldBeEmpty();
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task Null_origin_is_refused_with_403(string name)
    {
        AuthRoute route = RouteFor(name);
        object handler = route.CreateHandler();
        await using WebApplication app = await StartAsync(route, handler);

        using HttpResponseMessage response = await PostAsync(Client(app), route, Headers(("Origin", "null")));

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        handler.ReceivedCalls().ShouldBeEmpty();
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task Same_site_request_from_an_allowed_origin_reaches_the_handler(string name)
    {
        AuthRoute route = RouteFor(name);
        object handler = route.CreateHandler();
        await using WebApplication app = await StartAsync(route, handler);

        using HttpResponseMessage response = await PostAsync(Client(app), route, Headers(
            ("Sec-Fetch-Site", "same-site"),
            ("Origin", AllowedOrigin)));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        handler.ReceivedCalls().ShouldNotBeEmpty();
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task Request_with_no_browser_headers_reaches_the_handler(string name)
    {
        AuthRoute route = RouteFor(name);
        object handler = route.CreateHandler();
        await using WebApplication app = await StartAsync(route, handler);

        using HttpResponseMessage response = await PostAsync(Client(app), route, Headers());

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        handler.ReceivedCalls().ShouldNotBeEmpty();
    }

    // CreateHandler returns a substitute whose Handle call succeeds, so a request that gets past the filter ends in 200.
    private sealed record AuthRoute(
        Type EndpointType,
        string Path,
        string Body,
        Type HandlerType,
        Func<object> CreateHandler);

    private static AuthRoute RouteFor(string name) => name switch
    {
        "ForgotPassword" => new AuthRoute(
            ResolveEndpointType(name),
            "api/v1/auth/forgot-password",
            EmailBody,
            typeof(ICommandHandler<ForgotPasswordCommand>),
            () =>
            {
                ICommandHandler<ForgotPasswordCommand> handler = Substitute.For<ICommandHandler<ForgotPasswordCommand>>();
                handler.Handle(Arg.Any<ForgotPasswordCommand>(), Arg.Any<CancellationToken>())
                    .Returns(Task.FromResult(Result.Success()));
                return handler;
            }),
        "ResendVerification" => new AuthRoute(
            ResolveEndpointType(name),
            "api/v1/auth/resend-verification",
            EmailBody,
            typeof(ICommandHandler<ResendVerificationCommand, VerificationStarted>),
            () =>
            {
                ICommandHandler<ResendVerificationCommand, VerificationStarted> handler =
                    Substitute.For<ICommandHandler<ResendVerificationCommand, VerificationStarted>>();
                handler.Handle(Arg.Any<ResendVerificationCommand>(), Arg.Any<CancellationToken>())
                    .Returns(Task.FromResult(Result.Success(new VerificationStarted("secret"))));
                return handler;
            }),
        "Register" => new AuthRoute(
            ResolveEndpointType(name),
            "api/v1/auth/register",
            RegisterBody,
            typeof(ICommandHandler<RegisterUserCommand, VerificationStarted>),
            () =>
            {
                ICommandHandler<RegisterUserCommand, VerificationStarted> handler =
                    Substitute.For<ICommandHandler<RegisterUserCommand, VerificationStarted>>();
                handler.Handle(Arg.Any<RegisterUserCommand>(), Arg.Any<CancellationToken>())
                    .Returns(Task.FromResult(Result.Success(new VerificationStarted("secret"))));
                return handler;
            }),
        _ => throw new ArgumentOutOfRangeException(nameof(name), name, "Unknown auth route."),
    };

    private static Type ResolveEndpointType(string name) =>
        typeof(CustomResults).Assembly.GetType($"Web.Api.Endpoints.Users.{name}", throwOnError: true)!;

    private static async Task<WebApplication> StartAsync(AuthRoute route, object handler)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Cors:AllowedOrigins:0"] = AllowedOrigin,
        });
        builder.Services.AddSingleton(route.HandlerType, handler);

        WebApplication app = builder.Build();

        var endpoint = (IEndpoint)Activator.CreateInstance(route.EndpointType, nonPublic: true)!;
        endpoint.MapEndpoint(app);

        await app.StartAsync();

        return app;
    }

    private static HttpClient Client(WebApplication app) =>
        ((TestServer)app.Services.GetRequiredService<IServer>()).CreateClient();

    private static Dictionary<string, string> Headers(params (string Name, string Value)[] pairs) =>
        pairs.ToDictionary(pair => pair.Name, pair => pair.Value);

    private static async Task<HttpResponseMessage> PostAsync(
        HttpClient client,
        AuthRoute route,
        IReadOnlyDictionary<string, string> headers)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, route.Path)
        {
            Content = new StringContent(route.Body, Encoding.UTF8, "application/json"),
        };

        foreach (KeyValuePair<string, string> header in headers)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        return await client.SendAsync(request);
    }
}
