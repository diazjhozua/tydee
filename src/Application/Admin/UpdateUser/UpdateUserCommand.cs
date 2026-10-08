using Application.Abstractions.Messaging;

namespace Application.Admin.UpdateUser;

public sealed record UpdateUserCommand(
    Guid UserId,
    bool? IsEmailVerified,
    bool? IsLocked) : ICommand;