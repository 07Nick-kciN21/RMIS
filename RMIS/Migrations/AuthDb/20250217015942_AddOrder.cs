using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations.AuthDb
{
    /// <inheritdoc />
    public partial class AddOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "Permissions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "Departments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "AspNetRoles",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Order",
                table: "Permissions");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "AspNetRoles");
        }
    }
}
