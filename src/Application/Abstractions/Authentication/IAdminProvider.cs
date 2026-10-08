namespace Application.Abstractions.Authentication;

public interface IAdminProvider
{
    /// <summary>
    /// Whether the given email address is configured as an administrator.
    /// </summary>
    bool IsAdmin(string email);
}