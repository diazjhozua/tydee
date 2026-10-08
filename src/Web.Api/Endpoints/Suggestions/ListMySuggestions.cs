using Application.Abstractions.Authentication;
using Application.Abstractions.Messaging;
using Application.Suggestions.Mine;
using Contracts.Suggestions;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Suggestions;

internal sealed class ListMySuggestions : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/suggestions/mine", async (
            IUserContext userContext,
            IQueryHandler<ListMySuggestionsQuery, List<MySuggestionItem>> handler,
            CancellationToken cancellationToken) =>
        {
            Result<List<MySuggestionItem>> result = await handler.Handle(
                new ListMySuggestionsQuery(userContext.UserId),
                cancellationToken);

            return result.Match(
                items => Results.Ok(items
                    .Select(s => new SuggestionResponse(
                        s.Id,
                        s.Message,
                        s.Category,
                        s.Rating,
                        s.Status,
                        s.AdminNote,
                        s.CreatedAtUtc))
                    .ToList()),
                CustomResults.Problem);
        })
        .WithTags(Tags.Suggestions)
        .WithSummary("List the current user's submitted suggestions.")
        .RequireAuthorization();
    }
}