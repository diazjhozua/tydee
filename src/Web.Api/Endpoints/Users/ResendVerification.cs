using Application.Abstractions.Messaging;
using Application.Users.ResendVerification;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class ResendVerification : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/resend-verification", async (
            ResendVerificationRequest request,
            ICommandHandler<ResendVerificationCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new ResendVerificationCommand(request.Email),
                cancellationToken);

            return result.Match(
                () => Results.Ok(new { message = "If that email needs verifying, we sent a new link." }),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Email a fresh verification link. Always answers success.")
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);
    }
}
