using NetArchTest.Rules;
using Shouldly;
using Web.Api.Endpoints;
using Xunit;

namespace Tests.Architecture;

public sealed class LayerTests
{
    [Fact]
    public void SharedKernel_DoesNotDependOnTydeeLayers()
    {
        TestResult result = Types.InAssembly(typeof(SharedKernel.Result).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "Domain",
                "Contracts",
                "Application",
                "Infrastructure",
                "Web.Api")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }

    [Fact]
    public void Domain_DoesNotDependOnOuterLayers()
    {
        TestResult result = Types.InAssembly(typeof(Domain.Accounts.Account).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "Contracts",
                "Application",
                "Infrastructure",
                "Web.Api")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }

    [Fact]
    public void Contracts_DoesNotDependOnTydeeLayers()
    {
        TestResult result = Types.InAssembly(typeof(Contracts.Auth.AuthResponse).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "SharedKernel",
                "Domain",
                "Application",
                "Infrastructure",
                "Web.Api")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }

    [Fact]
    public void Contracts_DoesNotDependOnInfrastructureLibraries()
    {
        TestResult result = Types.InAssembly(typeof(Contracts.Auth.AuthResponse).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "Microsoft.AspNetCore",
                "Microsoft.EntityFrameworkCore",
                "Npgsql",
                "FluentValidation",
                "MailKit",
                "Scrutor")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }

    [Fact]
    public void Application_DoesNotDependOnOuterLayers()
    {
        TestResult result = Types.InAssembly(typeof(Application.DependencyInjection).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny("Infrastructure", "Web.Api")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }

    [Fact]
    public void Infrastructure_DoesNotDependOnContractsOrWeb()
    {
        TestResult result = Types.InAssembly(typeof(Infrastructure.DependencyInjection).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny("Contracts", "Web.Api")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }

    [Fact]
    public void Endpoints_DoNotReferenceDomain()
    {
        TestResult result = Types.InAssembly(typeof(IEndpoint).Assembly)
            .That()
            .ImplementInterface(typeof(IEndpoint))
            .ShouldNot()
            .HaveDependencyOn("Domain")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue(
            string.Join(", ", result.FailingTypes?.Select(t => t.FullName) ?? []));
    }

    [Fact]
    public void Endpoints_AreSealed()
    {
        TestResult result = Types.InAssembly(typeof(IEndpoint).Assembly)
            .That()
            .ImplementInterface(typeof(IEndpoint))
            .Should()
            .BeSealed()
            .GetResult();

        result.IsSuccessful.ShouldBeTrue();
    }
}
