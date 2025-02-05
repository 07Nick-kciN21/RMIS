using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddMetaData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.AlterColumn<DateTime>(
                name: "ConstructionStartDate",
                table: "ConstructNotices",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ConstructionEndDate",
                table: "ConstructNotices",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pipelines_MetaDatas_MetaDataId",
                table: "Pipelines");

            migrationBuilder.DropTable(
                name: "MetaDatas");

            migrationBuilder.DropIndex(
                name: "IX_Pipelines_MetaDataId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "MetaDataId",
                table: "Pipelines");

            migrationBuilder.DropColumn(
                name: "MetaId",
                table: "Pipelines");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ConstructionStartDate",
                table: "ConstructNotices",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "ConstructionEndDate",
                table: "ConstructNotices",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);
        }
    }
}
