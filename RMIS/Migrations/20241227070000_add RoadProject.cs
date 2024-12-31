using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class addRoadProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RoadProjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    Proposer = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdministrativeDistrict = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartPoint = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EndPoint = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartEndLocation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RoadLength = table.Column<float>(type: "real", nullable: false),
                    CurrentRoadWidth = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlannedRoadWidth = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublicLand = table.Column<int>(type: "int", nullable: false),
                    PrivateLand = table.Column<int>(type: "int", nullable: false),
                    PublicPrivateLand = table.Column<int>(type: "int", nullable: false),
                    ConstructionBudget = table.Column<int>(type: "int", nullable: false),
                    LandAcquisitionBudget = table.Column<int>(type: "int", nullable: false),
                    CompensationBudget = table.Column<int>(type: "int", nullable: false),
                    TotalBudget = table.Column<int>(type: "int", nullable: false),
                    PlannedExpansionRange = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StreetViewPhotos = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoadProjects", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoadProjects");
        }
    }
}
