using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddRoadProjectProcess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "road_project_process",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProcessId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Step = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    District = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExecutionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProjectName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BudgetFiscalYearApprovedAmount = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContractType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionPeriod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AnnouncementCommencementDate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AwardCompletionDate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousMeetingStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousMeetingResolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentMeetingResolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SupportingDocument = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_road_project_process", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "road_project_process");
        }
    }
}
