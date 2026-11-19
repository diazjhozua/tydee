using Application.Abstractions.Authentication;
using Application.Abstractions.Data;
using Application.Abstractions.Email;
using Application.Abstractions.Messaging;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using SharedKernel;

namespace Application.Users.Register;

internal sealed class RegisterUserCommandHandler(
    IApplicationDbContext context,
    IPasswordHasher passwordHasher,
    IEmailSender emailSender,
    IDateTimeProvider dateTimeProvider)
    : ICommandHandler<RegisterUserCommand>
{
    private const int VerificationTokenLifetimeHours = 24;

    // Every address gets success, so the response can't reveal whether an account exists.
    public async Task<Result> Handle(RegisterUserCommand command, CancellationToken cancellationToken)
    {
        string email = command.Email.ToLowerInvariant();

        if (await context.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            return await AnswerExistingAccountAsync(email, command.Password, cancellationToken);
        }

        string verificationToken = Guid.NewGuid().ToString("N");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FirstName = command.FirstName,
            LastName = command.LastName,
            PasswordHash = passwordHasher.Hash(command.Password),
            IsEmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpiresAt = dateTimeProvider.UtcNow.AddHours(VerificationTokenLifetimeHours),
        };

        user.Raise(new UserRegisteredDomainEvent(user.Id));

        context.Users.Add(user);

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

            return await AnswerExistingAccountAsync(email, command.Password, cancellationToken);
        }

        await emailSender.SendEmailVerificationAsync(email, verificationToken, cancellationToken);

        return Result.Success();
    }

    private async Task<Result> AnswerExistingAccountAsync(
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        // Pay the same hash cost as a new registration, so response time doesn't reveal which path ran.
        _ = passwordHasher.Hash(password);

        await emailSender.SendAlreadyRegisteredAsync(email, cancellationToken);

        return Result.Success();
    }
}
