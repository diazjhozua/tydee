using Application.Abstractions.Messaging;

namespace Application.Accounts.Reorder;

public sealed record ReorderAccountsCommand(Guid UserId, List<Guid> AccountIds) : ICommand;
