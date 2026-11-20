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
            ICommandHandler<VerifyEmailCommand, VerifyEmailResult> handler,
            CancellationToken cancellationToken) =>
        {
            Result<VerifyEmailResult> result = await handler.Handle(
                new VerifyEmailCommand(request.Code, request.VerificationSecret ?? string.Empty),
                cancellationToken);

            return result.Match(
                outcome => Results.Ok(new VerifyEmailResponse(outcome.HasPassword)),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
        .WithSummary("Verify an email address with the 6-digit code, from the browser that registered.");
    }
}
