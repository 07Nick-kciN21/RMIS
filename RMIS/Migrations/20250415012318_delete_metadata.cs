using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class delete_metadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pipelines_MetaDatas_MetaDataId",
                table: "Pipelines");

            migrationBuilder.DropIndex(
                name: "IX_Pipelines_MetaDataId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "MetaDataId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "MetaId",
                table: "Pipelines");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MetaDataId",
                table: "Pipelines",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MetaId",
                table: "Pipelines",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Pipelines_MetaDataId",
                table: "Pipelines",
                column: "MetaDataId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pipelines_MetaDatas_MetaDataId",
                table: "Pipelines",
                column: "MetaDataId",
                principalTable: "MetaDatas",
                principalColumn: "Id");
        }
    }
}
