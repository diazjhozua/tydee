using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceEmailTokenWithVerificationCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_users_email_verification_token",
                schema: "public",
                table: "users");

            migrationBuilder.DropColumn(
                name: "email_verification_token",
                schema: "public",
                table: "users");

            migrationBuilder.DropColumn(
                name: "email_verification_token_expires_at",
                schema: "public",
                table: "users");

            migrationBuilder.AddColumn<string>(
                name: "presented_session_hash",
                schema: "public",
                table: "pending_emails",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "session_hash",
                schema: "public",
                table: "pending_emails",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "email_verifications",
                schema: "public",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    code_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    code_expires_on_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    last_issued_on_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    pending_password_hash = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_email_verifications", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_email_verifications_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_email_verifications_session_hash",
                schema: "public",
                table: "email_verifications",
                column: "session_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "email_verifications",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "presented_session_hash",
                schema: "public",
                table: "pending_emails");

            migrationBuilder.DropColumn(
                name: "session_hash",
                schema: "public",
                table: "pending_emails");

            migrationBuilder.AddColumn<string>(
                name: "email_verification_token",
                schema: "public",
                table: "users",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "email_verification_token_expires_at",
                schema: "public",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_email_verification_token",
                schema: "public",
                table: "users",
                column: "email_verification_token",
                unique: true,
                filter: "\"email_verification_token\" IS NOT NULL");
        }
    }
}
