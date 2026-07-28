using Application.Abstractions.Messaging;

namespace Application.Expenses.List;

public sealed record ListExpensesQuery(
    Guid UserId,
    Guid? AccountId,
    int Page,
    int PageSize) : IQuery<List<ExpenseListItem>>;

public sealed record ExpenseListItem(
    Guid Id,
    Guid AccountId,
    string AccountName,
    decimal Amount,
    string? Note,
    DateOnly Date);
