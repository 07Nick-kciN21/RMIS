using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetFieldsToRoadProjectProcess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConstructionBudget",
                table: "road_project_process",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LandAcquisitionBudget",
                table: "road_project_process",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConstructionBudget",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "LandAcquisitionBudget",
                table: "road_project_process");
        }
    }
}
