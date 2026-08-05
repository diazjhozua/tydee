using Domain.Accounts;
using Domain.Adjustments;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Adjustments;

internal sealed class AdjustmentConfiguration : IEntityTypeConfiguration<Adjustment>
{
    public void Configure(EntityTypeBuilder<Adjustment> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Amount).HasColumnType("numeric(18,2)");

        builder.HasIndex(a => new { a.UserId, a.Date });

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Account>()
            .WithMany()
            .HasForeignKey(a => a.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
