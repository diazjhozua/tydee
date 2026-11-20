using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Users;

internal sealed class EmailVerificationConfiguration : IEntityTypeConfiguration<EmailVerification>
{
    public void Configure(EntityTypeBuilder<EmailVerification> builder)
    {
        // One pending verification per account. Deleting the account deletes its verification.
        builder.HasKey(v => v.UserId);

        builder.HasOne<User>()
            .WithOne()
            .HasForeignKey<EmailVerification>(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(v => v.SessionHash).HasMaxLength(64);
        builder.HasIndex(v => v.SessionHash).IsUnique();

        builder.Property(v => v.CodeHash).HasMaxLength(64);
    }
}
