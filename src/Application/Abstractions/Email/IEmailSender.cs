namespace Application.Abstractions.Email;

public interface IEmailSender
{
    Task SendEmailVerificationAsync(
        string toEmail,
        string verificationToken,
        CancellationToken cancellationToken = default);

    Task SendPasswordResetAsync(
        string toEmail,
        string resetToken,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tells the owner of an existing account that someone tried to register the address.
    /// Sent instead of a verification link, so no token is created.
    /// </summary>
    Task SendAlreadyRegisteredAsync(
        string toEmail,
        CancellationToken cancellationToken = default);
}
