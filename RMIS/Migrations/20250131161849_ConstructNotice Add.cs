using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class ConstructNoticeAdd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.CreateTable(
                name: "ConstructNotices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LicenseNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProjectNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ApprovalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProjectName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionStartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConstructionEndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AdministrativeDistrict = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionLocation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DaytimeConstructionPeriod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NighttimeConstructionPeriod = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PipelineUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionReason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChangeStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChangeDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BeforeConstructionPhoto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AfterConstructionPhoto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NoticePhoto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TrafficControlPhoto = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionScope = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NoticePosition = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PositionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConstructNotices", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConstructNotices");
        }
    }
}
