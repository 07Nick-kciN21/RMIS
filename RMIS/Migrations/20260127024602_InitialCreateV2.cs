using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreateV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminDist",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    orderId = table.Column<int>(type: "int", nullable: false),
                    City = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Town = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminDist", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    DepartmentIds = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Categories_Categories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                    ConstructionStartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ConstructionEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AdministrativeDistrict = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionLocation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DaytimeConstructionPeriod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NighttimeConstructionPeriod = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PipelineUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChangeStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ChangeDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletionDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BeforeConstructionPhoto = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AfterConstructionPhoto = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NoticePhoto = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TrafficControlPhoto = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionScope = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NoticePosition = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PositionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConstructNotices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GeometryTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Svg = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeometryTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MapSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TileType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ImageFormat = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Attribution = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MapSources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MetaDatas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DataId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReleaseLocation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConversionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LayerCoverage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdateFrequency = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReleaseDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ProvidingUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DataContactPerson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContactPhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DataSummary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReferenceSystemInfo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MetadataUpdateTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DataType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DisplayScale = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MetaDatas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "road_project_process_1",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    District = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExecutionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProjectName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousMeetingStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousMeetingResolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentMeetingResolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SupportingDocument = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_road_project_process_1", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "road_project_process_2",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    District = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExecutionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProjectName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousMeetingStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreviousMeetingResolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CurrentMeetingResolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SupportingDocument = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_road_project_process_2", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "road_project_process_3",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    District = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordTitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExecutionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConstructionUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
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
                    table.PrimaryKey("PK_road_project_process_3", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RoadProjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Index = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
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
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlannedExpansionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StreetViewId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreateTime = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoadProjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Pipelines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ManagementUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsGeneralPipeline = table.Column<bool>(type: "bit", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DepartmentIds = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    dataInfo = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pipelines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pipelines_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Layers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GeometryTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PipelineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImportEnabled = table.Column<bool>(type: "bit", nullable: false),
                    ImportConfiguration = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Layers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Layers_GeometryTypes_GeometryTypeId",
                        column: x => x.GeometryTypeId,
                        principalTable: "GeometryTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Layers_Pipelines_PipelineId",
                        column: x => x.PipelineId,
                        principalTable: "Pipelines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Areas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConstructionUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdminDistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LayerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Areas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Areas_AdminDist_AdminDistId",
                        column: x => x.AdminDistId,
                        principalTable: "AdminDist",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Areas_Layers_LayerId",
                        column: x => x.LayerId,
                        principalTable: "Layers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Points",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Index = table.Column<int>(type: "int", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    Property = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AreaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Points", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Points_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Areas_AdminDistId",
                table: "Areas",
                column: "AdminDistId");

            migrationBuilder.CreateIndex(
                name: "IX_Areas_LayerId",
                table: "Areas",
                column: "LayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ParentId",
                table: "Categories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_GeometryTypeId",
                table: "Layers",
                column: "GeometryTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_PipelineId",
                table: "Layers",
                column: "PipelineId");

            migrationBuilder.CreateIndex(
                name: "IX_Pipelines_CategoryId",
                table: "Pipelines",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Points_AreaId",
                table: "Points",
                column: "AreaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConstructNotices");

            migrationBuilder.DropTable(
                name: "MapSources");

            migrationBuilder.DropTable(
                name: "MetaDatas");

            migrationBuilder.DropTable(
                name: "Points");

            migrationBuilder.DropTable(
                name: "road_project_process_1");

            migrationBuilder.DropTable(
                name: "road_project_process_2");

            migrationBuilder.DropTable(
                name: "road_project_process_3");

            migrationBuilder.DropTable(
                name: "RoadProjects");

            migrationBuilder.DropTable(
                name: "Areas");

            migrationBuilder.DropTable(
                name: "AdminDist");

            migrationBuilder.DropTable(
                name: "Layers");

            migrationBuilder.DropTable(
                name: "GeometryTypes");

            migrationBuilder.DropTable(
                name: "Pipelines");

            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}
