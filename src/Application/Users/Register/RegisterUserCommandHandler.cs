using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Email;
using Application.Abstractions.Messaging;
using Application.Abstractions.Verification;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Register;

internal sealed class RegisterUserCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    IVerificationSecrets verificationSecrets,
    IEmailSender emailSender,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<RegisterUserCommand, VerificationStarted>
{
    // Every address gets success, so the response can't reveal whether an account exists.
    public async Task<Result<VerificationStarted>> Handle(RegisterUserCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();
        string sessionSecret = verificationSecrets.NewSessionSecret();

        if (await context.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            return await AnswerExistingAccountAsync(email, command.Password, sessionSecret, cancellationToken);
        }

        DateTime now = dateTimeProvider.UtcNow;
        var userId = Guid.NewGuid();
        string code = verificationSecrets.NewCode();

        var user = new User
        {
            Id = userId,
            Email = email,
            FirstName = command.FirstName,
            LastName = command.LastName,

            // Stays empty until the code is spent. The registration password waits in the verification row.
            PasswordHash = string.Empty,
            IsEmailVerified = false,
        };

        var verification = new EmailVerification
        {
            UserId = userId,
            SessionHash = verificationSecrets.HashSessionSecret(sessionSecret),
            PendingPasswordHash = passwordHasher.Hash(command.Password),
        };

        verification.Issue(verificationSecrets.HashCode(userId, code), now);

        user.Raise(new UserRegisteredDomainEvent(user.Id));

        context.Users.Add(user);
        context.EmailVerifications.Add(verification);

        // Sent before the save. If the send fails, nothing is committed, so no row is left bound to a
        // browser secret that never reached the browser.
        await emailSender.SendEmailVerificationAsync(email, code, cancellationToken);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Two registrations for one address raced, and the unique index rejected this insert.
            // Answer as an existing account. Any other failure is rethrown.
            if (!await context.Users.AnyAsync(u => u.Email == email, cancellationToken))
            {
                throw;
            }

            return await AnswerExistingAccountAsync(email, command.Password, sessionSecret, cancellationToken);
        }

        return new VerificationStarted(sessionSecret);
    }

    private async Task<Result<VerificationStarted>> AnswerExistingAccountAsync(
        string email,
        string password,
        string sessionSecret,
        CancellationToken cancellationToken)
    {
        // Pay the same hash cost as a new registration, so response time doesn't reveal which path ran.
        _ = passwordHasher.Hash(password);

        await emailSender.SendAlreadyRegisteredAsync(email, cancellationToken);

        // The secret is random and stored nowhere, so it looks the same as a real one and binds nothing.
        return new VerificationStarted(sessionSecret);
    }
}
