using Domain.Suggestions;
using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Suggestions;

internal sealed class SuggestionConfiguration : IEntityTypeConfiguration<Suggestion>
{
    public void Configure(EntityTypeBuilder<Suggestion> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Message).HasMaxLength(2000);
        builder.Property(s => s.Category).HasMaxLength(50);
        builder.Property(s => s.Status).HasMaxLength(20);
        builder.Property(s => s.AdminNote).HasMaxLength(1000);

        builder.HasIndex(s => new { s.UserId, s.CreatedAtUtc });
        builder.HasIndex(s => s.Status);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}