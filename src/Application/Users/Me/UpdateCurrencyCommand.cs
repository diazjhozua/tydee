using Application.Abstractions.Messaging;

namespace Application.Users.Me;

public sealed record UpdateCurrencyCommand(Guid UserId, string Currency) : ICommand;
