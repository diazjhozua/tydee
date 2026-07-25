using Application.Abstractions.Authentication;
using Microsoft.AspNetCore.Identity;

namespace Infrastructure.Authentication;

internal sealed class PasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<string> _hasher = new();

    public string Hash(string password) =>
        _hasher.HashPassword(string.Empty, password);

    public bool Verify(string password, string passwordHash) =>
        _hasher.VerifyHashedPassword(string.Empty, passwordHash, password)
            != PasswordVerificationResult.Failed;
}
