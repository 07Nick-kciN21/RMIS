using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class ChangePipelineandsystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PipelineName",
                table: "Pipelines",
                newName: "ManagementUnit");

            migrationBuilder.RenameColumn(
                name: "ManagementUnit",
                table: "Pipeline_sys",
                newName: "Pipeline");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ManagementUnit",
                table: "Pipelines",
                newName: "PipelineName");

            migrationBuilder.RenameColumn(
                name: "Pipeline",
                table: "Pipeline_sys",
                newName: "ManagementUnit");
        }
    }
}
