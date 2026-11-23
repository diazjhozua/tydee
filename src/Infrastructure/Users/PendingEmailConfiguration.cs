using Application.Users;
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
        builder.Property(p => p.Email).HasMaxLength(EmailRules.MaxLength);
        builder.Property(p => p.SessionHash).HasMaxLength(64);
        builder.Property(p => p.PresentedSessionHash).HasMaxLength(64);

        // The worker claims the due row with the earliest next attempt.
        builder.HasIndex(p => p.NextAttemptOnUtc);
    }
}
