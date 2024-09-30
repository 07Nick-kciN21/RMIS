using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class Alterpipeline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pipelines_Pipeline_sys_Pipeline_sysId",
                table: "Pipelines");

            migrationBuilder.DropIndex(
                name: "IX_Pipelines_Pipeline_sysId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "Pipeline_sysId",
                table: "Pipelines");

            migrationBuilder.AddColumn<Guid>(
                name: "PipelineSysId",
                table: "Pipelines",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Pipelines_PipelineSysId",
                table: "Pipelines",
                column: "PipelineSysId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pipelines_Pipeline_sys_PipelineSysId",
                table: "Pipelines",
                column: "PipelineSysId",
                principalTable: "Pipeline_sys",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pipelines_Pipeline_sys_PipelineSysId",
                table: "Pipelines");

            migrationBuilder.DropIndex(
                name: "IX_Pipelines_PipelineSysId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "PipelineSysId",
                table: "Pipelines");

            migrationBuilder.AddColumn<Guid>(
                name: "Pipeline_sysId",
                table: "Pipelines",
                type: "uniqueidentifier",
                nullable: true);

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
