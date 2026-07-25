using Domain.Users;
using SharedKernel;

namespace Application.Users.Register;

internal sealed class UserRegisteredDomainEventHandler : IDomainEventHandler<UserRegisteredDomainEvent>
{
    public Task Handle(UserRegisteredDomainEvent domainEvent, CancellationToken cancellationToken)
    {
        // Placeholder for follow-up side effects (e.g. seeding default accounts).
        return Task.CompletedTask;
    }
}
