using Application.Abstractions.Messaging;
using Application.Users;
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
            ICommandHandler<ResendVerificationCommand, VerificationStarted> handler,
            CancellationToken cancellationToken) =>
        {
            Result<VerificationStarted> result = await handler.Handle(
                new ResendVerificationCommand(request.Email, request.PresentedVerificationSecret),
                cancellationToken);

            return result.Match(
                started => Results.Ok(new ResendVerificationResponse(
                    "If that email needs verifying, we sent a new code.",
                    started.VerificationSecret)),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Email a fresh verification code and rebind the browser. Always answers success.")
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
        .AddEndpointFilter<RejectCrossSiteRequestsFilter>();
    }
}
