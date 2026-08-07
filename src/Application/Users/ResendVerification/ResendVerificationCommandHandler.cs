using Application.Abstractions.Data;
using Application.Abstractions.Email;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ResendVerification;

internal sealed class ResendVerificationCommandHandler(
    IApplicationDbContext context,
    IEmailSender emailSender,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<ResendVerificationCommand>
{
    private const int VerificationTokenLifetimeHours = 24;

    public async Task<Result> Handle(ResendVerificationCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();

        User? user = await context.Users.SingleOrDefaultAsync(
            u => u.Email == email, cancellationToken);

        // Unknown or already-verified emails get the same silent success so
        // the endpoint can't be used to probe which accounts exist.
        if (user is null || user.IsEmailVerified)
        {
            return Result.Success();
        }

        string verificationToken = Guid.NewGuid().ToString("N");

        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationTokenExpiresAt =
            dateTimeProvider.UtcNow.AddHours(VerificationTokenLifetimeHours);

        await context.SaveChangesAsync(cancellationToken);

        await emailSender.SendEmailVerificationAsync(email, verificationToken, cancellationToken);

        return Result.Success();
    }
}
