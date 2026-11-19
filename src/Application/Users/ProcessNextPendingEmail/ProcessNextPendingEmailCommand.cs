using Application.Abstractions.Messaging;

namespace Application.Users.ProcessNextPendingEmail;

/// <summary>
/// Sends one queued account email, or drops the request. Returns true when a request was processed and false when
/// nothing was due. Run by the background worker.
/// </summary>
public sealed record ProcessNextPendingEmailCommand : ICommand<bool>;
