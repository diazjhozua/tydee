using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Suggestions;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Suggestions.UpdateStatus;

internal sealed class UpdateSuggestionStatusCommandHandler(IApplicationDbContext context)
    : ICommandHandler<UpdateSuggestionStatusCommand>
{
    public async Task<Result> Handle(
        UpdateSuggestionStatusCommand command,
        CancellationToken cancellationToken)
    {
        Suggestion? suggestion = await context.Suggestions
            .SingleOrDefaultAsync(s => s.Id == command.SuggestionId, cancellationToken);

        if (suggestion is null)
        {
            return Result.Failure(SuggestionErrors.NotFound);
        }

        suggestion.Status = command.Status;
        suggestion.AdminNote = command.AdminNote;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}