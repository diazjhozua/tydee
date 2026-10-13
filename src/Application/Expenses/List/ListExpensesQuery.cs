using Application.Abstractions.Messaging;

namespace Application.Expenses.List;

public sealed record ListExpensesQuery(
    Guid UserId,
    Guid? AccountId,
    int? Year,
    int? Month,
    int Page,
    int PageSize,
    Guid? RecurringExpenseId = null) : IQuery<List<ExpenseListItem>>;

public sealed record ExpenseListItem(
    Guid Id,
    Guid AccountId,
    string AccountName,
    decimal Amount,
    string? Note,
    string? Category,
    DateOnly Date,
    Guid? RecurringExpenseId);
