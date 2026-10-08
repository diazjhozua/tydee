using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Suggestions;
using SharedKernel;

namespace Application.Suggestions.Create;

internal sealed class CreateSuggestionCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<CreateSuggestionCommand, Guid>
{
    public async Task<Result<Guid>> Handle(
        CreateSuggestionCommand command,
        CancellationToken cancellationToken)
    {
        var suggestion = new Suggestion
        {
            Id = Guid.NewGuid(),
            UserId = command.UserId,
            Message = command.Message,
            Category = command.Category,
            Rating = command.Rating,
            CreatedAtUtc = dateTimeProvider.UtcNow,
        };

        context.Suggestions.Add(suggestion);

        await context.SaveChangesAsync(cancellationToken);

        return suggestion.Id;
    }
}