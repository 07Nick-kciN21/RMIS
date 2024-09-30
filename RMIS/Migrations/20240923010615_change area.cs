using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class changearea : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Town",
                table: "Areas",
                newName: "ConstructionUnit");

            migrationBuilder.RenameColumn(
                name: "City",
                table: "Areas",
                newName: "Category");

            migrationBuilder.AddColumn<Guid>(
                name: "AdminDistId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PipelineId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Areas_AdminDistId",
                table: "Areas",
                column: "AdminDistId");

            migrationBuilder.CreateIndex(
                name: "IX_Areas_PipelineId",
                table: "Areas",
                column: "PipelineId");

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_AdminDist_AdminDistId",
                table: "Areas",
                column: "AdminDistId",
                principalTable: "AdminDist",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_Pipelines_PipelineId",
                table: "Areas",
                column: "PipelineId",
                principalTable: "Pipelines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Areas_AdminDist_AdminDistId",
                table: "Areas");

            migrationBuilder.DropForeignKey(
                name: "FK_Areas_Pipelines_PipelineId",
                table: "Areas");

            migrationBuilder.DropIndex(
                name: "IX_Areas_AdminDistId",
                table: "Areas");

            migrationBuilder.DropIndex(
                name: "IX_Areas_PipelineId",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "AdminDistId",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "PipelineId",
                table: "Areas");

            migrationBuilder.RenameColumn(
                name: "ConstructionUnit",
                table: "Areas",
                newName: "Town");

            migrationBuilder.RenameColumn(
                name: "Category",
                table: "Areas",
                newName: "City");
        }
    }
}
