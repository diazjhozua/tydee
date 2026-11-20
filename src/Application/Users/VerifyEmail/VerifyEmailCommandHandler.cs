using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Application.Abstractions.Verification;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.VerifyEmail;

internal sealed class VerifyEmailCommandHandler(
    IApplicationDbContext context,
    IVerificationSecrets verificationSecrets,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<VerifyEmailCommand, VerifyEmailResult>
{
    public async Task<Result<VerifyEmailResult>> Handle(VerifyEmailCommand command, CancellationToken cancellationToken)
    {
        // No browser secret means this isn't the registering browser. That gets the same answer as a wrong code.
        if (string.IsNullOrEmpty(command.VerificationSecret))
        {
            return Result.Failure<VerifyEmailResult>(UserErrors.InvalidVerificationToken);
        }

        string sessionHash = verificationSecrets.HashSessionSecret(command.VerificationSecret);

        // Find the owner first, so the row lock is taken before the user and the row are read.
        Guid? userId = await context.EmailVerifications
            .Where(v => v.SessionHash == sessionHash)
            .Select(v => (Guid?)v.UserId)
            .SingleOrDefaultAsync(cancellationToken);

        if (userId is null)
        {
            return Result.Failure<VerifyEmailResult>(UserErrors.InvalidVerificationToken);
        }

        await using IUserLock userLock = await context.LockUserByIdAsync(userId.Value, cancellationToken);

        EmailVerification? verification = await context.EmailVerifications
            .SingleOrDefaultAsync(v => v.UserId == userId.Value && v.SessionHash == sessionHash, cancellationToken);

        User? user = await context.Users.SingleOrDefaultAsync(u => u.Id == userId.Value, cancellationToken);

        if (verification is null || user is null)
        {
            return Result.Failure<VerifyEmailResult>(UserErrors.InvalidVerificationToken);
        }

        if (user.IsEmailVerified || user.IsLocked)
        {
            // Nothing left to verify, or an admin locked the account. The pending state is no longer usable.
            context.EmailVerifications.Remove(verification);

            await context.SaveChangesAsync(cancellationToken);
            await userLock.CommitAsync(cancellationToken);

            return Result.Failure<VerifyEmailResult>(UserErrors.InvalidVerificationToken);
        }

        DateTime now = dateTimeProvider.UtcNow;
        string? codeHash = verification.CodeHash;

        // Expired, spent, or never issued. Doesn't count as a guess.
        if (codeHash is null || !verification.CanSpend(now))
        {
            return Result.Failure<VerifyEmailResult>(UserErrors.InvalidVerificationToken);
        }

        if (!verificationSecrets.CodeMatches(userId.Value, command.Code, codeHash))
        {
            // A wrong guess is saved and committed, so the count survives the failed request.
            verification.RecordWrongCode();

            await context.SaveChangesAsync(cancellationToken);
            await userLock.CommitAsync(cancellationToken);

            return Result.Failure<VerifyEmailResult>(UserErrors.InvalidVerificationToken);
        }

        bool hasPassword = verification.PendingPasswordHash is not null;

        // Only the browser that registered can reach this point, so the registration password is the owner's.
        user.IsEmailVerified = true;
        user.PasswordHash = verification.PendingPasswordHash ?? string.Empty;

        context.EmailVerifications.Remove(verification);

        await context.SaveChangesAsync(cancellationToken);
        await userLock.CommitAsync(cancellationToken);

        return new VerifyEmailResult(hasPassword);
    }
}
