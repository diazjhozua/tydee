using Application.Abstractions.Data;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.VerifyEmail;

internal sealed class VerifyEmailCommandHandler(
    IApplicationDbContext context,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<VerifyEmailCommand>
{
    public async Task<Result> Handle(VerifyEmailCommand command, CancellationToken cancellationToken)
    {
        User? user = await context.Users
            .SingleOrDefaultAsync(u => u.EmailVerificationToken == command.Token, cancellationToken);

        if (user is null || user.EmailVerificationTokenExpiresAt < dateTimeProvider.UtcNow)
        {
            return Result.Failure(UserErrors.InvalidVerificationToken);
        }

        if (user.IsEmailVerified)
        {
            return Result.Failure(UserErrors.EmailAlreadyVerified);
        }

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresAt = null;

        await context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
