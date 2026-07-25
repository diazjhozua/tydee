using Application.Abstractions.Messaging;
using Application.Users.Register;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class Register : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/register", async (
            RegisterRequest request,
            ICommandHandler<RegisterUserCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new RegisterUserCommand(
                request.Email,
                request.Password,
                request.FirstName,
                request.LastName);

            Result<Guid> result = await handler.Handle(command, cancellationToken);

            return result.Match(
                _ => Results.Ok(new RegisterResponse(
                    "Registration successful. Please check your email to verify your account.")),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Register a new account and send a verification email.");
    }
}
