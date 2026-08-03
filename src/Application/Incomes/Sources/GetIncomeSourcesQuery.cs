using Application.Abstractions.Messaging;

namespace Application.Incomes.Sources;

public sealed record GetIncomeSourcesQuery(Guid UserId) : IQuery<List<string>>;
