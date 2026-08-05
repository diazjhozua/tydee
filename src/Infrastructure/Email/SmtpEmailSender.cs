using Application.Abstractions.Email;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Infrastructure.Email;

internal sealed class SmtpEmailSender(SmtpSettings settings) : IEmailSender
{
    public async Task SendEmailVerificationAsync(
        string toEmail,
        string verificationToken,
        CancellationToken cancellationToken = default)
    {
        using MimeMessage message = BuildMessage(
            toEmail,
            BuildSubject("Verify your email address"),
            BuildVerificationBody(verificationToken));

        await SendAsync(message, cancellationToken);
    }

    public async Task SendPasswordResetAsync(
        string toEmail,
        string resetToken,
        CancellationToken cancellationToken = default)
    {
        using MimeMessage message = BuildMessage(
            toEmail,
            BuildSubject("Reset your password"),
            BuildPasswordResetBody(resetToken));

        await SendAsync(message, cancellationToken);
    }

    private async Task SendAsync(MimeMessage message, CancellationToken cancellationToken)
    {
        using SmtpClient client = new();

        await client.ConnectAsync(settings.Host, settings.Port, SecureSocketOptions.StartTls, cancellationToken);
        await client.AuthenticateAsync(settings.Username, settings.Password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }

    private MimeMessage BuildMessage(string toEmail, string subject, string htmlBody)
    {
        MimeMessage message = new();
        message.From.Add(MailboxAddress.Parse(settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };
        return message;
    }

    private string BuildSubject(string subject)
    {
        string testPrefix = settings.IsProduction ? string.Empty : "[TEST] ";
        return $"{testPrefix}[{settings.AppName}] {subject}";
    }

    private string BuildVerificationBody(string token)
    {
        string link = $"{settings.FrontendUrl}/verify-email?token={token}";

        return $"""
        <h2>Welcome to {settings.AppName}!</h2>
        <p>Click the button below to verify your email address:</p>
        <p><a href="{link}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Verify email</a></p>
        <p>Or copy this link into your browser:</p>
        <p>{link}</p>
        <p>This link expires in 24 hours.</p>
        """;
    }

    private string BuildPasswordResetBody(string token)
    {
        string link = $"{settings.FrontendUrl}/reset-password?token={token}";

        return $"""
        <h2>Reset your {settings.AppName} password</h2>
        <p>Click the button below to choose a new password:</p>
        <p><a href="{link}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset password</a></p>
        <p>Or copy this link into your browser:</p>
        <p>{link}</p>
        <p>This link expires in 1 hour. If you didn't ask for this, you can safely ignore it.</p>
        """;
    }
}
