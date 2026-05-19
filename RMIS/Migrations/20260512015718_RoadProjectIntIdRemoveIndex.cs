using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class RoadProjectIntIdRemoveIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop PK constraint, then drop old Guid Id and Index columns, then add int IDENTITY Id
            migrationBuilder.Sql("ALTER TABLE [RoadProjects] DROP CONSTRAINT [PK_RoadProjects]");
            migrationBuilder.Sql("ALTER TABLE [RoadProjects] DROP COLUMN [Id]");
            migrationBuilder.Sql("ALTER TABLE [RoadProjects] DROP COLUMN [Index]");
            migrationBuilder.Sql("ALTER TABLE [RoadProjects] ADD [Id] INT IDENTITY(1,1) NOT NULL");
            migrationBuilder.Sql("ALTER TABLE [RoadProjects] ADD CONSTRAINT [PK_RoadProjects] PRIMARY KEY ([Id])");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "RoadProjects",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<int>(
                name: "Index",
                table: "RoadProjects",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");
        }
    }
}
