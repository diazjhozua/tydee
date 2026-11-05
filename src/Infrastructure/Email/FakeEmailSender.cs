using Application.Abstractions.Email;

namespace Infrastructure.Email;

// Selected by Email:Provider = "Fake" (the Testing environment only). It keeps
// the verification and reset flows usable without an SMTP server; tests read
// the tokens from the database instead of an inbox.
internal sealed class FakeEmailSender : IEmailSender
{
    public Task SendEmailVerificationAsync(
        string toEmail,
        string verificationToken,
        CancellationToken cancellationToken = default)
    {
        _ = toEmail;
        _ = verificationToken;
        _ = cancellationToken;

        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(
        string toEmail,
        string resetToken,
        CancellationToken cancellationToken = default)
    {
        _ = toEmail;
        _ = resetToken;
        _ = cancellationToken;

        return Task.CompletedTask;
    }
}
