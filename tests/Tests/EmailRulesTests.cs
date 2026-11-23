using Application.Users;
using Shouldly;
using Xunit;

namespace Tests;

public class EmailRulesTests
{
    [Fact]
    public void Max_length_matches_the_varchar_width_of_the_email_columns()
    {
        EmailRules.MaxLength.ShouldBe(256);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(255)]
    [InlineData(256)]
    public void Addresses_up_to_the_limit_are_within_length(int length)
    {
        EmailRules.IsWithinMaxLength(new string('a', length)).ShouldBeTrue();
    }

    [Fact]
    public void Address_one_over_the_limit_is_not_within_length()
    {
        EmailRules.IsWithinMaxLength(new string('a', 257)).ShouldBeFalse();
    }

    [Fact]
    public void Null_is_treated_as_within_length_so_the_validator_reports_it()
    {
        EmailRules.IsWithinMaxLength(null).ShouldBeTrue();
    }
}
