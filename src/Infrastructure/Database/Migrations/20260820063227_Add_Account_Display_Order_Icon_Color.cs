using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Database.Migrations
{
    /// <inheritdoc />
    public partial class Add_Account_Display_Order_Icon_Color : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "color",
                schema: "dbo",
                table: "accounts",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                schema: "dbo",
                table: "accounts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "icon",
                schema: "dbo",
                table: "accounts",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "color",
                schema: "dbo",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "display_order",
                schema: "dbo",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "icon",
                schema: "dbo",
                table: "accounts");
        }
    }
}
