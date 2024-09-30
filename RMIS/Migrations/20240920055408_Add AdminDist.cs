using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminDist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "City",
                table: "Roads");

            migrationBuilder.DropColumn(
                name: "Town",
                table: "Roads");

            migrationBuilder.DropColumn(
                name: "ManagementUnit",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "SystemName",
                table: "Pipelines");

            migrationBuilder.RenameColumn(
                name: "FuncId",
                table: "Roads",
                newName: "DistId");

            migrationBuilder.AddColumn<Guid>(
                name: "AdminDistId",
                table: "Roads",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "AdminDist",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    City = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Town = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminDist", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Roads_AdminDistId",
                table: "Roads",
                column: "AdminDistId");

            migrationBuilder.AddForeignKey(
                name: "FK_Roads_AdminDist_AdminDistId",
                table: "Roads",
                column: "AdminDistId",
                principalTable: "AdminDist",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Roads_AdminDist_AdminDistId",
                table: "Roads");

            migrationBuilder.DropTable(
                name: "AdminDist");

            migrationBuilder.DropIndex(
                name: "IX_Roads_AdminDistId",
                table: "Roads");

            migrationBuilder.DropColumn(
                name: "AdminDistId",
                table: "Roads");

            migrationBuilder.RenameColumn(
                name: "DistId",
                table: "Roads",
                newName: "FuncId");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Roads",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Town",
                table: "Roads",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ManagementUnit",
                table: "Pipelines",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SystemName",
                table: "Pipelines",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
