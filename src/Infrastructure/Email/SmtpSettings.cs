namespace Infrastructure.Email;

public sealed class SmtpSettings
{
    public const string SectionName = "Smtp";

    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
    public string AppName { get; init; } = "Tydee";
    public string FrontendUrl { get; init; } = "http://localhost:3000";
    public bool IsProduction { get; init; }
}
