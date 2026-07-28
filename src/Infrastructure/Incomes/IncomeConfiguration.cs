using Domain.Incomes;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Incomes;

internal sealed class IncomeConfiguration : IEntityTypeConfiguration<Income>
{
    public void Configure(EntityTypeBuilder<Income> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Amount).HasColumnType("numeric(18,2)");
        builder.Property(i => i.Source).HasMaxLength(200);

        builder.HasIndex(i => new { i.UserId, i.Date });

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(i => i.Allocations)
            .WithOne()
            .HasForeignKey(a => a.IncomeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
