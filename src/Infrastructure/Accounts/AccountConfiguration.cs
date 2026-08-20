using Domain.Accounts;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Accounts;

internal sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name).HasMaxLength(100);
        builder.Property(a => a.AllocationPercent).HasColumnType("numeric(5,2)");
        builder.Property(a => a.Icon).HasMaxLength(30);
        builder.Property(a => a.Color).HasMaxLength(20);

        builder.HasIndex(a => new { a.UserId, a.Name })
            .IsUnique()
            .HasFilter("[is_archived] = 0");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
