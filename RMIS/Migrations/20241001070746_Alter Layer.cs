using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AlterLayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Areas_Layers_LayerId",
                table: "Areas");

            migrationBuilder.DropForeignKey(
                name: "FK_Areas_Pipelines_PipelineId",
                table: "Areas");

            migrationBuilder.DropIndex(
                name: "IX_Areas_PipelineId",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "PipelineId",
                table: "Areas");

            migrationBuilder.AlterColumn<Guid>(
                name: "LayerId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_Layers_LayerId",
                table: "Areas",
                column: "LayerId",
                principalTable: "Layers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Areas_Layers_LayerId",
                table: "Areas");

            migrationBuilder.AlterColumn<Guid>(
                name: "LayerId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "PipelineId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Areas_PipelineId",
                table: "Areas",
                column: "PipelineId");

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_Layers_LayerId",
                table: "Areas",
                column: "LayerId",
                principalTable: "Layers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_Pipelines_PipelineId",
                table: "Areas",
                column: "PipelineId",
                principalTable: "Pipelines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
