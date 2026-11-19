using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Users;

internal sealed class PendingEmailConfiguration : IEntityTypeConfiguration<PendingEmail>
{
    public void Configure(EntityTypeBuilder<PendingEmail> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Kind).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.Email).HasMaxLength(256);

        // The worker claims the due row with the earliest next attempt.
        builder.HasIndex(p => p.NextAttemptOnUtc);
    }
}
