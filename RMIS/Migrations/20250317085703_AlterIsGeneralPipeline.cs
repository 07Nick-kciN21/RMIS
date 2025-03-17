using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AlterIsGeneralPipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "IsGeneralPipeline",
                table: "Pipelines",
                type: "bit",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "IsGeneralPipeline",
                table: "Pipelines",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit");
        }
    }
}
