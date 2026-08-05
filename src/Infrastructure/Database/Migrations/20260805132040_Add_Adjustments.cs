using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class Add_Adjustments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "adjustments",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    account_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_adjustments", x => x.id);
                    table.ForeignKey(
                        name: "fk_adjustments_accounts_account_id",
                        column: x => x.account_id,
                        principalSchema: "dbo",
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_adjustments_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "dbo",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_adjustments_account_id",
                schema: "dbo",
                table: "adjustments",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "ix_adjustments_user_id_date",
                schema: "dbo",
                table: "adjustments",
                columns: new[] { "user_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "adjustments",
                schema: "dbo");
        }
    }
}
