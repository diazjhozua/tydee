using Application.Abstractions.Messaging;

namespace Application.Users.Me;

public sealed record GetMeQuery(Guid UserId) : IQuery<MeResult>;

public sealed record MeResult(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string Currency);
