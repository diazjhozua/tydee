namespace Infrastructure.Authentication;

public sealed class AdminSettings
{
    public const string SectionName = "Admin";

    public string[] Emails { get; init; } = [];
}