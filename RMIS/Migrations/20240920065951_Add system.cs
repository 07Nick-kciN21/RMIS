using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class Addsystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                    SystemName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ManagementUnit = table.Column<string>(type: "nvarchar(max)", nullable: false)
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
        }
    }
}
