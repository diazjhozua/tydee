using Application.Abstractions.Messaging;
using Application.Users.ResetPassword;
using Contracts.Auth;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Users;

internal sealed class ResetPassword : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/auth/reset-password", async (
            ResetPasswordRequest request,
            ICommandHandler<ResetPasswordCommand> handler,
            CancellationToken cancellationToken) =>
        {
            Result result = await handler.Handle(
                new ResetPasswordCommand(request.Token, request.NewPassword),
                cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Auth)
        .WithSummary("Set a new password using a reset token. Revokes all sessions.")
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);
    }
}
