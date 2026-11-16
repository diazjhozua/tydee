using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddIsLockedToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_locked",
                schema: "public",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Unlock everyone at deploy. Existing lockout_end_utc values were admin
            // locks (about one year out) or failed-login lockouts (15 minutes). Admins
            // re-lock accounts that need it, which sets is_locked.
            migrationBuilder.Sql(
                "UPDATE public.users SET lockout_end_utc = NULL WHERE lockout_end_utc IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Locks cleared by Up are not restored. Only the column is removed.
            migrationBuilder.DropColumn(
                name: "is_locked",
                schema: "public",
                table: "users");
        }
    }
}
