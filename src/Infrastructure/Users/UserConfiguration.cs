using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Users;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email).HasMaxLength(256);
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.FirstName).HasMaxLength(100);
        builder.Property(u => u.LastName).HasMaxLength(100);

        builder.Property(u => u.Currency).HasMaxLength(3).HasDefaultValue("PHP");

        builder.Property(u => u.EmailVerificationToken).HasMaxLength(64);
        builder.Property(u => u.PasswordResetTokenHash).HasMaxLength(64);
        builder.HasIndex(u => u.EmailVerificationToken)
            .IsUnique()
            .HasFilter("[email_verification_token] IS NOT NULL");

        builder.HasMany(u => u.RefreshTokens)
            .WithOne(t => t.User)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
