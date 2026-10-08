using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Suggestions.Create;
using Contracts.Suggestions;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Suggestions;

internal sealed class CreateSuggestion : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("api/v1/suggestions", async (
            CreateSuggestionRequest request,
            IUserContext userContext,
            ICommandHandler<CreateSuggestionCommand, Guid> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new CreateSuggestionCommand(
                userContext.UserId,
                request.Message,
                request.Category,
                request.Rating);

            Result<Guid> result = await handler.Handle(command, cancellationToken);

            return result.Match(id => Results.Ok(new { id }), CustomResults.Problem);
        })
        .WithTags(Tags.Suggestions)
        .WithSummary("Submit a suggestion or feedback.")
        .RequireAuthorization()
        .RequireRateLimiting(RateLimitingExtensions.SuggestionPolicy);
    }
}