using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class addIsGeneralPipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IsGeneralPipeline",
                table: "Pipelines",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsGeneralPipeline",
                table: "Pipelines");
        }
    }
}
