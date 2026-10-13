using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringExpenses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "recurring_expense_id",
                schema: "public",
                table: "expenses",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "recurring_expenses",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_archived = table.Column<bool>(type: "boolean", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_recurring_expenses", x => x.id);
                    table.ForeignKey(
                        name: "fk_recurring_expenses_accounts_account_id",
                        column: x => x.account_id,
                        principalSchema: "public",
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_recurring_expenses_users_user_id",
                        column: x => x.user_id,
                        principalSchema: "public",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_expenses_recurring_expense_id",
                schema: "public",
                table: "expenses",
                column: "recurring_expense_id");

            migrationBuilder.CreateIndex(
                name: "ix_recurring_expenses_account_id",
                schema: "public",
                table: "recurring_expenses",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "ix_recurring_expenses_user_id_is_archived",
                schema: "public",
                table: "recurring_expenses",
                columns: new[] { "user_id", "is_archived" });

            migrationBuilder.AddForeignKey(
                name: "fk_expenses_recurring_expenses_recurring_expense_id",
                schema: "public",
                table: "expenses",
                column: "recurring_expense_id",
                principalSchema: "public",
                principalTable: "recurring_expenses",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_expenses_recurring_expenses_recurring_expense_id",
                schema: "public",
                table: "expenses");

            migrationBuilder.DropTable(
                name: "recurring_expenses",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "ix_expenses_recurring_expense_id",
                schema: "public",
                table: "expenses");

            migrationBuilder.DropColumn(
                name: "recurring_expense_id",
                schema: "public",
                table: "expenses");
        }
    }
}
