using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class Alterpipelinesys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Pipeline",
                table: "Pipeline_sys");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Pipelines",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "Pipelines");

            migrationBuilder.AddColumn<string>(
                name: "Pipeline",
                table: "Pipeline_sys",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
