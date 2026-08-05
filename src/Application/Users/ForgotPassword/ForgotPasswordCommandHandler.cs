using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Email;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.ForgotPassword;

internal sealed class ForgotPasswordCommandHandler(
    IApplicationDbContext context,
    ITokenProvider tokenProvider,
    IEmailSender emailSender,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<ForgotPasswordCommand>
{
    private const int ResetTokenLifetimeMinutes = 60;

    public async Task<Result> Handle(ForgotPasswordCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();

        User? user = await context.Users.SingleOrDefaultAsync(
            u => u.Email == email, cancellationToken);

        // Unknown emails get the same answer as known ones so the endpoint
        // can't be used to probe which accounts exist.
        if (user is null)
        {
            return Result.Success();
        }

        string rawToken = tokenProvider.GenerateRefreshToken();

        user.PasswordResetTokenHash = tokenProvider.HashRefreshToken(rawToken);
        user.PasswordResetTokenExpiresAt = dateTimeProvider.UtcNow.AddMinutes(ResetTokenLifetimeMinutes);

        await context.SaveChangesAsync(cancellationToken);

        await emailSender.SendPasswordResetAsync(email, rawToken, cancellationToken);

        return Result.Success();
    }
}
