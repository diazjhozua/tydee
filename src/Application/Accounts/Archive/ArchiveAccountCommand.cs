using Application.Abstractions.Messaging;

namespace Application.Accounts.Archive;

public sealed record ArchiveAccountCommand(Guid UserId, Guid AccountId) : ICommand;
