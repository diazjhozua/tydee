using Infrastructure.Authentication;
using Shouldly;
using Xunit;

namespace Tests;

public class LockedUserTokenValidatorTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public void A_missing_or_malformed_subject_names_no_user(string? subject)
    {
        LockedUserTokenValidator.ParseUserId(subject).ShouldBeNull();
    }

    [Fact]
    public void A_valid_subject_parses_to_its_user_id()
    {
        var id = Guid.NewGuid();

        LockedUserTokenValidator.ParseUserId(id.ToString()).ShouldBe(id);
    }

    [Fact]
    public void Only_an_existing_unlocked_user_is_allowed()
    {
        LockedUserTokenValidator.IsAllowed(false).ShouldBeTrue();
        LockedUserTokenValidator.IsAllowed(true).ShouldBeFalse();
        LockedUserTokenValidator.IsAllowed(null).ShouldBeFalse();
    }
}
