using Application.Abstractions.Messaging;

namespace Application.Incomes.Delete;

public sealed record DeleteIncomeCommand(Guid UserId, Guid IncomeId) : ICommand;
