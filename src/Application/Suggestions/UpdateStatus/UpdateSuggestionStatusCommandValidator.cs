using Domain.Suggestions;
using FluentValidation;

namespace Application.Suggestions.UpdateStatus;

internal sealed class UpdateSuggestionStatusCommandValidator
    : AbstractValidator<UpdateSuggestionStatusCommand>
{
    public UpdateSuggestionStatusCommandValidator()
    {
        RuleFor(c => c.Status)
            .Must(SuggestionStatuses.IsValid)
            .WithMessage("Status must be Open, Done or Dismissed.");
        RuleFor(c => c.AdminNote).MaximumLength(1000);
    }
}