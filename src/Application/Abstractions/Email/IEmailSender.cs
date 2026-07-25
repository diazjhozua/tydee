namespace Application.Abstractions.Email;

public interface IEmailSender
{
    Task SendEmailVerificationAsync(
        string toEmail,
        string verificationToken,
        CancellationToken cancellationToken = default);
}
