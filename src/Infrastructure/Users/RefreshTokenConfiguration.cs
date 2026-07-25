using Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Users;

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Token).HasMaxLength(200);

        builder.HasIndex(t => t.Token).IsUnique();

        builder.Ignore(t => t.IsExpired);
        builder.Ignore(t => t.IsActive);
    }
}
