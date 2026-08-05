using Application.Abstractions.Messaging;
using Application.Users.ForgotPassword;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class ForgotPassword : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/forgot-password", async (
            ForgotPasswordRequest request,
            ICommandHandler<ForgotPasswordCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new ForgotPasswordCommand(request.Email),
                cancellationToken);

            return result.Match(
                () => Results.Ok(new { message = "If that email has an account, we sent a reset link." }),
                CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Email a password reset link. Always answers success.")
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);
    }
}
