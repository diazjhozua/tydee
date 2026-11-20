using Application.Abstractions.Messaging;
using Application.Users;
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
            ICommandHandler<RegisterUserCommand, VerificationStarted> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new RegisterUserCommand(
                request.Email,
                request.Password,
                request.ConfirmPassword,
                request.FirstName,
                request.LastName);

            Result<VerificationStarted> result = await handler.Handle(command, cancellationToken);

            return result.Match(
                started => Results.Ok(new RegisterResponse(
                    "Registration successful. Enter the 6-digit code we emailed you.",
                    started.VerificationSecret)),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
        .WithSummary("Register a new account and email a verification code.");
    }
}
