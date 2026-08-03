using Application.Abstractions.Messaging;

namespace Application.Expenses.Categories;

public sealed record GetExpenseCategoriesQuery(Guid UserId) : IQuery<List<string>>;
