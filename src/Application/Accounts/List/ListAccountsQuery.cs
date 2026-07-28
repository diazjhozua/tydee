using Application.Abstractions.Messaging;

namespace Application.Accounts.List;

public sealed record ListAccountsQuery(Guid UserId, bool IncludeArchived)
    : IQuery<List<AccountListItem>>;
