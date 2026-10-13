using Application.Abstractions.Messaging;

namespace Application.RecurringExpenses.List;

public sealed record ListRecurringExpensesQuery(
    Guid UserId,
    bool IncludeArchived) : IQuery<List<RecurringExpenseListItem>>;

public sealed record RecurringExpenseListItem(
    Guid Id,
    string Name,
    Guid AccountId,
    string AccountName,
    decimal Amount,
    string? Category,
    string? Note,
    bool IsArchived);