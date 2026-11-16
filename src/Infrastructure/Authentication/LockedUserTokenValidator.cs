using System.Security.Claims;
using Application.Abstractions.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Authentication;

/// <summary>
/// Rejects an otherwise valid access token when its user is locked or no longer
/// exists. Runs on every authenticated request, so an admin lock takes effect at
/// once instead of when the 15-minute access token expires.
/// </summary>
internal sealed class LockedUserTokenValidator(IApplicationDbContext db) : JwtBearerEvents
{
    public override async Task TokenValidated(TokenValidatedContext context)
    {
        Guid? userId = ParseUserId(context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier));

        if (userId is not { } id)
        {
            context.Fail("The access token does not name a user.");
            return;
        }

        bool? isLocked = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => (bool?)u.IsLocked)
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        if (!IsAllowed(isLocked))
        {
            context.Fail("The account is locked or no longer exists.");
        }
    }

    internal static Guid? ParseUserId(string? rawUserId) =>
        Guid.TryParse(rawUserId, out Guid userId) ? userId : null;

    /// <summary>
    /// False means the user exists and is not locked. Null means the user no longer
    /// exists. Both are rejected.
    /// </summary>
    internal static bool IsAllowed(bool? isLocked) => isLocked is false;
}
