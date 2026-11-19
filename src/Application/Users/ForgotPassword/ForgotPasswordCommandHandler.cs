using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using SharedKernel;

namespace Application.Users.ForgotPassword;

internal sealed class ForgotPasswordCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<ForgotPasswordCommand>
{
    public async Task<Result> Handle(ForgotPasswordCommand command, CancellationToken cancellationToken)
    {
        // Known and unknown addresses do the same work here: one insert, no lookup, no email.
        // The worker looks up the account, makes the token, and sends the link later, so response
        // time doesn't reveal whether the account exists.
        context.PendingEmails.Add(
            PendingEmail.Request(PendingEmailKind.PasswordReset, command.Email, dateTimeProvider.UtcNow));

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
