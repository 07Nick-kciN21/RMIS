using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddRoadProjectCreateTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "RoadProjects");

            migrationBuilder.AddColumn<long>(
                name: "CreateTime",
                table: "RoadProjects",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreateTime",
                table: "RoadProjects");

            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "RoadProjects",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
