using Application.Abstractions.Messaging;
using Application.Users.VerifyEmail;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class VerifyEmail : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/verify-email", async (
            VerifyEmailRequest request,
            ICommandHandler<VerifyEmailCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new VerifyEmailCommand(request.Token),
                cancellationToken);

            return result.Match(
                () => Results.Ok(new RegisterResponse("Email verified successfully.")),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Verify an email address using the token from the verification email.");
    }
}
