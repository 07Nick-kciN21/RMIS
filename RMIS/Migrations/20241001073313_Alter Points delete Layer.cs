using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AlterPointsdeleteLayer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Points_LayerId",
                table: "Points");

            migrationBuilder.DropColumn(
                name: "LayerId",
                table: "Points");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LayerId",
                table: "Points",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Points_LayerId",
                table: "Points",
                column: "LayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Points_Layers_LayerId",
                table: "Points",
                column: "LayerId",
                principalTable: "Layers",
                principalColumn: "Id");
        }
    }
}
