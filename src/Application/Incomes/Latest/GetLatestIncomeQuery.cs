using Application.Abstractions.Messaging;
using Application.Incomes.Get;

namespace Application.Incomes.Latest;

public sealed record GetLatestIncomeQuery(Guid UserId) : IQuery<IncomeResult>;
