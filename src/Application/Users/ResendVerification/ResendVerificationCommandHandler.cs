using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using SharedKernel;

namespace Application.Users.ResendVerification;

internal sealed class ResendVerificationCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<ResendVerificationCommand>
{
    public async Task<Result> Handle(ResendVerificationCommand command, CancellationToken cancellationToken)
    {
        // Every address does the same work here: one insert. The worker finds the account, if any, and
        // sends the link. Unknown and already-verified addresses get no link, but the response time is the same.
        context.PendingEmails.Add(
            PendingEmail.Request(PendingEmailKind.VerificationResend, command.Email, dateTimeProvider.UtcNow));

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
