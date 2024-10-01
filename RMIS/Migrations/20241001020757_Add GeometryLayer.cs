using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddGeometryLayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pipelines_Pipeline_sys_Pipeline_sysId",
                table: "Pipelines");

            migrationBuilder.DropTable(
                name: "Pipeline_sys");

            migrationBuilder.DropIndex(
                name: "IX_Pipelines_Pipeline_sysId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "Pipeline_sysId",
                table: "Pipelines");

            migrationBuilder.AddColumn<Guid>(
                name: "LayerId",
                table: "Points",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GeometryTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Svg = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeometryTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Layers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GeometryTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConstructionUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdminDistId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PipelineId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Layers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Layers_AdminDist_AdminDistId",
                        column: x => x.AdminDistId,
                        principalTable: "AdminDist",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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

            migrationBuilder.CreateIndex(
                name: "IX_Points_LayerId",
                table: "Points",
                column: "LayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Pipelines_CategoryId",
                table: "Pipelines",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_AdminDistId",
                table: "Layers",
                column: "AdminDistId");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_GeometryTypeId",
                table: "Layers",
                column: "GeometryTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_PipelineId",
                table: "Layers",
                column: "PipelineId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pipelines_Categories_CategoryId",
                table: "Pipelines",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Points_Layers_LayerId",
                table: "Points",
                column: "LayerId",
                principalTable: "Layers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pipelines_Categories_CategoryId",
                table: "Pipelines");

            migrationBuilder.DropForeignKey(
                name: "FK_Points_Layers_LayerId",
                table: "Points");

            migrationBuilder.DropTable(
                name: "Layers");

            migrationBuilder.DropTable(
                name: "GeometryTypes");

            migrationBuilder.DropIndex(
                name: "IX_Points_LayerId",
                table: "Points");

            migrationBuilder.DropIndex(
                name: "IX_Pipelines_CategoryId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "LayerId",
                table: "Points");

            migrationBuilder.AddColumn<Guid>(
                name: "Pipeline_sysId",
                table: "Pipelines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Pipeline_sys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SystemName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pipeline_sys", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pipelines_Pipeline_sysId",
                table: "Pipelines",
                column: "Pipeline_sysId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pipelines_Pipeline_sys_Pipeline_sysId",
                table: "Pipelines",
                column: "Pipeline_sysId",
                principalTable: "Pipeline_sys",
                principalColumn: "Id");
        }
    }
}
