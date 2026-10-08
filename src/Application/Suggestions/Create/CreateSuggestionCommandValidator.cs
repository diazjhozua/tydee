using FluentValidation;

namespace Application.Suggestions.Create;

internal sealed class CreateSuggestionCommandValidator : AbstractValidator<CreateSuggestionCommand>
{
    public CreateSuggestionCommandValidator()
    {
        RuleFor(c => c.Message).NotEmpty().MaximumLength(2000);
        RuleFor(c => c.Category).MaximumLength(50);
        RuleFor(c => c.Rating).InclusiveBetween(1, 5).When(c => c.Rating.HasValue);
    }
}