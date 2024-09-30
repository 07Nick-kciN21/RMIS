using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class changeCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Pipelines");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Roads",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Roads");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Pipelines",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
