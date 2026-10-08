using Application.Abstractions.Messaging;
using Application.Suggestions.UpdateStatus;
using Contracts.Suggestions;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Suggestions;

internal sealed class UpdateSuggestionStatus : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPatch("api/v1/suggestions/{suggestionId:guid}", async (
            Guid suggestionId,
            UpdateSuggestionStatusRequest request,
            ICommandHandler<UpdateSuggestionStatusCommand> handler,
            CancellationToken cancellationToken) =>
        {
            var command = new UpdateSuggestionStatusCommand(
                suggestionId,
                request.Status,
                request.AdminNote);

            Result result = await handler.Handle(command, cancellationToken);

            return result.Match(Results.NoContent, CustomResults.Problem);
        })
        .WithTags(Tags.Suggestions)
        .WithSummary("Update a suggestion's status and note. Admin only.")
        .RequireAuthorization("Admin");
    }
}