using Application.Abstractions.Messaging;

namespace Application.Accounts.UpdateAllocationTemplate;

public sealed record UpdateAllocationTemplateCommand(
    Guid UserId,
    List<AllocationTemplateItem> Items) : ICommand;

public sealed record AllocationTemplateItem(Guid AccountId, decimal Percent);
