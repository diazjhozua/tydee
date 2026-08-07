using Application.Abstractions.Messaging;

namespace Application.Users.ResendVerification;

public sealed record ResendVerificationCommand(string Email) : ICommand;
