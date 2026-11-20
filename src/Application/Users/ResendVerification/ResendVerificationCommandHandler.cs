using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Abstractions.Verification;
using Domain.Users;
using SharedKernel;

namespace Application.Users.ResendVerification;

internal sealed class ResendVerificationCommandHandler(
    IApplicationDbContext context,
    IVerificationSecrets verificationSecrets,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<ResendVerificationCommand, VerificationStarted>
{
    public async Task<Result<VerificationStarted>> Handle(ResendVerificationCommand command, CancellationToken cancellationToken)
    {
        // Every address does the same work here: one insert, and a fresh secret for the caller. The worker finds
        // the account, if any, and sends the code. Unknown and already-verified addresses get no code.
        string sessionSecret = verificationSecrets.NewSessionSecret();

        string? presentedHash = string.IsNullOrEmpty(command.PresentedVerificationSecret)
            ? null
            : verificationSecrets.HashSessionSecret(command.PresentedVerificationSecret);

        context.PendingEmails.Add(PendingEmail.Request(
            PendingEmailKind.VerificationResend,
            command.Email,
            dateTimeProvider.UtcNow,
            verificationSecrets.HashSessionSecret(sessionSecret),
            presentedHash));

        await context.SaveChangesAsync(cancellationToken);

        return new VerificationStarted(sessionSecret);
    }
}
