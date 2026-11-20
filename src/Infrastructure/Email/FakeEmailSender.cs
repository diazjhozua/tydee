using Application.Abstractions.Email;

namespace Infrastructure.Email;

// Selected by Email:Provider = "Fake" (the Testing environment only). It keeps
// the verification and reset flows usable without an SMTP server. Tests seed a
// known verification code instead of reading the inbox, because only its HMAC is stored.
internal sealed class FakeEmailSender : IEmailSender
{
    public Task SendEmailVerificationAsync(
        string toEmail,
        string code,
        CancellationToken cancellationToken = default)
    {
        _ = toEmail;
        _ = code;
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

    public Task SendAlreadyRegisteredAsync(
        string toEmail,
        CancellationToken cancellationToken = default)
    {
        _ = toEmail;
        _ = cancellationToken;

        return Task.CompletedTask;
    }
}
