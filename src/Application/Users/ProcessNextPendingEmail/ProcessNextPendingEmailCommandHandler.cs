using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Email;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SharedKernel;

namespace Application.Users.ProcessNextPendingEmail;

internal sealed class ProcessNextPendingEmailCommandHandler(
    IApplicationDbContext context,
    ITokenProvider tokenProvider,
    IEmailSender emailSender,
    IDateTimeProvider dateTimeProvider,
    ILogger<ProcessNextPendingEmailCommandHandler> logger)
    : ICommandHandler<ProcessNextPendingEmailCommand, bool>
{
    private const int ResetTokenLifetimeMinutes = 60;
    private const int VerificationTokenLifetimeHours = 24;
    private const int MaxAttempts = 5;
    private const int RetryBackoffSecondsPerAttempt = 30;

    public async Task<Result<bool>> Handle(ProcessNextPendingEmailCommand command, CancellationToken cancellationToken)
    {
        DateTime now = dateTimeProvider.UtcNow;

        // The claim holds the row until it commits, so a second worker never sends the same email twice.
        await using IPendingEmailClaim claim = await context.ClaimNextPendingEmailAsync(now, cancellationToken);

        PendingEmail? request = claim.Request;

        if (request is null)
        {
            return false;
        }

        try
        {
            await DeliverAsync(request, now, cancellationToken);

            context.PendingEmails.Remove(request);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // Push the row back so it isn't retried until the backoff passes. After the last
            // attempt, drop it, so one bad address can't block the queue forever.
            request.Attempts++;

            logger.LogWarning(
                exception,
                "Account email delivery failed for {Kind}, attempt {Attempt} of {MaxAttempts}",
                request.Kind,
                request.Attempts,
                MaxAttempts);

            if (request.Attempts >= MaxAttempts)
            {
                context.PendingEmails.Remove(request);
            }
            else
            {
                request.NextAttemptOnUtc = now.AddSeconds(RetryBackoffSecondsPerAttempt * request.Attempts);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        await claim.CommitAsync(cancellationToken);

        return true;
    }

    private async Task DeliverAsync(PendingEmail request, DateTime now, CancellationToken cancellationToken)
    {
        switch (request.Kind)
        {
            case PendingEmailKind.PasswordReset:
                await DeliverPasswordResetAsync(request, now, cancellationToken);
                break;

            case PendingEmailKind.VerificationResend:
                await DeliverVerificationResendAsync(request, now, cancellationToken);
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(request), request.Kind, "Unknown pending email kind.");
        }
    }

    private async Task DeliverPasswordResetAsync(PendingEmail request, DateTime now, CancellationToken cancellationToken)
    {
        User? user = await context.Users.SingleOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        // Unknown and admin-locked addresses get no link. The caller still removes the request.
        if (user is null || user.IsLocked)
        {
            return;
        }

        string rawToken = tokenProvider.GenerateRefreshToken();

        // The token is stored only after the email goes out, so a failed send leaves no usable token behind.
        await emailSender.SendPasswordResetAsync(request.Email, rawToken, cancellationToken);

        user.PasswordResetTokenHash = tokenProvider.HashRefreshToken(rawToken);
        user.PasswordResetTokenExpiresAt = now.AddMinutes(ResetTokenLifetimeMinutes);
    }

    private async Task DeliverVerificationResendAsync(
        PendingEmail request,
        DateTime now,
        CancellationToken cancellationToken)
    {
        User? user = await context.Users.SingleOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        // Unknown and already-verified addresses get no link, which is the same answer the endpoint gives.
        if (user is null || user.IsEmailVerified)
        {
            return;
        }

        string verificationToken = Guid.NewGuid().ToString("N");

        await emailSender.SendEmailVerificationAsync(request.Email, verificationToken, cancellationToken);

        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationTokenExpiresAt = now.AddHours(VerificationTokenLifetimeHours);
    }
}
