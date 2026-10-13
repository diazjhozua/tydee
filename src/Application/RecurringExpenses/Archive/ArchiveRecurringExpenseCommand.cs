using Application.Abstractions.Messaging;

namespace Application.RecurringExpenses.Archive;

public sealed record ArchiveRecurringExpenseCommand(Guid UserId, Guid RecurringExpenseId) : ICommand;