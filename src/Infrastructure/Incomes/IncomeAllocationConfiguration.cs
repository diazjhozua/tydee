using Domain.Accounts;
using Domain.Incomes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Incomes;

internal sealed class IncomeAllocationConfiguration : IEntityTypeConfiguration<IncomeAllocation>
{
    public void Configure(EntityTypeBuilder<IncomeAllocation> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Amount).HasColumnType("numeric(18,2)");

        builder.HasIndex(a => a.IncomeId);
        builder.HasIndex(a => a.AccountId);

        builder.HasOne<Account>()
            .WithMany()
            .HasForeignKey(a => a.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
