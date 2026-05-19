using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddStep3DesignFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BasicDesignApproval",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConstructionExecution",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DesignDispatch",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DetailedDesignApproval",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BasicDesignApproval",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "ConstructionExecution",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "DesignDispatch",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "DetailedDesignApproval",
                table: "road_project_process");
        }
    }
}
