using Application.Abstractions.Messaging;

namespace Application.Users.Me;

public sealed record UpdateDefaultPageCommand(Guid UserId, string DefaultPage) : ICommand;
