using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations.AuthDb
{
    /// <inheritdoc />
    public partial class add_IsSystemProtected : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSystemProtected",
                table: "Permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystemProtected",
                table: "Departments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystemProtected",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystemProtected",
                table: "AspNetRoles",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSystemProtected",
                table: "Permissions");

            migrationBuilder.DropColumn(
                name: "IsSystemProtected",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "IsSystemProtected",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "IsSystemProtected",
                table: "AspNetRoles");
        }
    }
}
