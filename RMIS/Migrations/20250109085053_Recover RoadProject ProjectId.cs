using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class RecoverRoadProjectProjectId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "CreateTime",
                table: "RoadProjects",
                type: "bigint",
                nullable: false,
                defaultValueSql: "DATEDIFF(SECOND, '1970-01-01', GETUTCDATE())",
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<string>(
                name: "ProjectId",
                table: "RoadProjects",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "RoadProjects");

            migrationBuilder.AlterColumn<long>(
                name: "CreateTime",
                table: "RoadProjects",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldDefaultValueSql: "DATEDIFF(SECOND, '1970-01-01', GETUTCDATE())");
        }
    }
}
