using Domain.Accounts;
using Domain.Users;
using Infrastructure.Database;

namespace Tests.TestInfrastructure;

internal static class Seed
{
    public static User User(
        ApplicationDbContext db,
        string email = "user@example.com",
        string password = "Password123!",
        bool verified = true)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            FirstName = "Test",
            LastName = "User",
            PasswordHash = $"#{password}",
            IsEmailVerified = verified,
        };

        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    public static Account Account(
        ApplicationDbContext db,
        Guid userId,
        string name = "Budget",
        AccountType type = AccountType.Spending,
        decimal percent = 0,
        bool archived = false)
    {
        var account = new Account
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Type = type,
            AllocationPercent = percent,
            IsArchived = archived,
            CreatedAtUtc = DateTime.UtcNow,
        };

        db.Accounts.Add(account);
        db.SaveChanges();
        return account;
    }
}
