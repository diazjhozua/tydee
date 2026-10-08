using Application.Abstractions.Authentication;

namespace Infrastructure.Authentication;

internal sealed class AdminProvider(AdminSettings settings) : IAdminProvider
{
    public bool IsAdmin(string email) =>
        settings.Emails.Contains(email, StringComparer.OrdinalIgnoreCase);
}