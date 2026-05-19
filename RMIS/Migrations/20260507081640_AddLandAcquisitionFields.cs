using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddLandAcquisitionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExpropriationApproval",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExpropriationPlanPreReview",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExpropriationPlanSubmission",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MarketPriceReview",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NegotiatedPurchaseMeeting",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicHearing",
                table: "road_project_process",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpropriationApproval",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "ExpropriationPlanPreReview",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "ExpropriationPlanSubmission",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "MarketPriceReview",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "NegotiatedPurchaseMeeting",
                table: "road_project_process");

            migrationBuilder.DropColumn(
                name: "PublicHearing",
                table: "road_project_process");
        }
    }
}
