using Application.Abstractions.Messaging;
using Application.Suggestions.List;
using Contracts.Suggestions;
using SharedKernel;
using Web.Api.Extensions;
using Web.Api.Infrastructure;

namespace Web.Api.Endpoints.Suggestions;

internal sealed class ListSuggestions : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("api/v1/suggestions", async (
            string? status,
            int? page,
            int? pageSize,
            IQueryHandler<ListSuggestionsQuery, List<SuggestionListItem>> handler,
            CancellationToken cancellationToken) =>
        {
            var query = new ListSuggestionsQuery(status, page ?? 1, pageSize ?? 50);

            Result<List<SuggestionListItem>> result = await handler.Handle(query, cancellationToken);

            return result.Match(
                items => Results.Ok(items
                    .Select(s => new AdminSuggestionResponse(
                        s.Id,
                        s.UserId,
                        s.UserEmail,
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
        .WithSummary("List all submitted suggestions. Admin only.")
        .RequireAuthorization("Admin");
    }
}