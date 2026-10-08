using Application.Suggestions.Create;
using Application.Suggestions.UpdateStatus;
using Domain.Suggestions;
using Shouldly;
using Tests.TestInfrastructure;
using Xunit;

namespace Tests;

public class SuggestionCommandHandlerTests
{
    [Fact]
    public async Task Create_persists_the_suggestion_for_the_user()
    {
        using var db = TestDb.Create();
        var clock = new FixedDateTimeProvider();
        var user = Seed.User(db);

        var result = await new CreateSuggestionCommandHandler(db, clock).Handle(
            new CreateSuggestionCommand(user.Id, "Please add dark mode.", "Feature", 5),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        Suggestion saved = db.Suggestions.Single();
        saved.UserId.ShouldBe(user.Id);
        saved.Message.ShouldBe("Please add dark mode.");
        saved.Category.ShouldBe("Feature");
        saved.Rating.ShouldBe(5);
        saved.Status.ShouldBe(SuggestionStatuses.Open);
        saved.CreatedAtUtc.ShouldBe(clock.UtcNow);
    }

    [Fact]
    public async Task Updating_unknown_suggestion_returns_not_found()
    {
        using var db = TestDb.Create();

        var result = await new UpdateSuggestionStatusCommandHandler(db).Handle(
            new UpdateSuggestionStatusCommand(Guid.NewGuid(), SuggestionStatuses.Done, null),
            CancellationToken.None);

        result.Error.ShouldBe(SuggestionErrors.NotFound);
    }

    [Fact]
    public async Task Updating_status_sets_the_note()
    {
        using var db = TestDb.Create();
        var user = Seed.User(db);
        var suggestion = new Suggestion
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Message = "Add export.",
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Suggestions.Add(suggestion);
        db.SaveChanges();

        var result = await new UpdateSuggestionStatusCommandHandler(db).Handle(
            new UpdateSuggestionStatusCommand(suggestion.Id, SuggestionStatuses.Done, "Shipped in 1.18."),
            CancellationToken.None);

        result.IsSuccess.ShouldBeTrue();
        Suggestion saved = db.Suggestions.Single();
        saved.Status.ShouldBe(SuggestionStatuses.Done);
        saved.AdminNote.ShouldBe("Shipped in 1.18.");
    }
}