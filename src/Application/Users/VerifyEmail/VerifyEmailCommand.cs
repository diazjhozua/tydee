using Application.Abstractions.Messaging;

namespace Application.Users.VerifyEmail;

public sealed record VerifyEmailCommand(string Code, string VerificationSecret) : ICommand<VerifyEmailResult>;
