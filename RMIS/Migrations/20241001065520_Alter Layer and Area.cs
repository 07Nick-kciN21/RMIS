using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AlterLayerandArea : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Layers_AdminDist_AdminDistId",
                table: "Layers");

            migrationBuilder.DropIndex(
                name: "IX_Layers_AdminDistId",
                table: "Layers");

            migrationBuilder.DropColumn(
                name: "AdminDistId",
                table: "Layers");

            migrationBuilder.DropColumn(
                name: "ConstructionUnit",
                table: "Layers");

            migrationBuilder.AddColumn<Guid>(
                name: "LayerId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Areas_LayerId",
                table: "Areas",
                column: "LayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_Layers_LayerId",
                table: "Areas",
                column: "LayerId",
                principalTable: "Layers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Areas_Layers_LayerId",
                table: "Areas");

            migrationBuilder.DropIndex(
                name: "IX_Areas_LayerId",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "LayerId",
                table: "Areas");

            migrationBuilder.AddColumn<Guid>(
                name: "AdminDistId",
                table: "Layers",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "ConstructionUnit",
                table: "Layers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_AdminDistId",
                table: "Layers",
                column: "AdminDistId");

            migrationBuilder.AddForeignKey(
                name: "FK_Layers_AdminDist_AdminDistId",
                table: "Layers",
                column: "AdminDistId",
                principalTable: "AdminDist",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
