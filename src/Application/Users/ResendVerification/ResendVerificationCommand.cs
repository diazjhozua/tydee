using Application.Abstractions.Messaging;

namespace Application.Users.ResendVerification;

/// <summary>
/// <see cref="PresentedVerificationSecret"/> is the browser's current secret, or null when it has none.
/// A resend that presents the current secret keeps the registration password. Any other resend drops it.
/// </summary>
public sealed record ResendVerificationCommand(string Email, string? PresentedVerificationSecret)
    : ICommand<VerificationStarted>;
