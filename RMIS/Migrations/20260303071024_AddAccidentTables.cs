using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations
{
    /// <inheritdoc />
    public partial class AddAccidentTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "accident_101",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_101", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_102",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_102", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_103",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_103", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_104",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_104", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_105",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_105", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_106",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_106", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_107",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_107", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_108",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_108", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_109",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_109", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_110",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_110", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_111",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_111", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_112",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_112", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "accident_113",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    year = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    date = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    accident_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    location_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    county = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    countycode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    areacode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    road = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_road = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_section = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_lane = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    intersection_alley = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    road_other = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    longitude = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    latitude = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accident_113", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "accident_101");

            migrationBuilder.DropTable(
                name: "accident_102");

            migrationBuilder.DropTable(
                name: "accident_103");

            migrationBuilder.DropTable(
                name: "accident_104");

            migrationBuilder.DropTable(
                name: "accident_105");

            migrationBuilder.DropTable(
                name: "accident_106");

            migrationBuilder.DropTable(
                name: "accident_107");

            migrationBuilder.DropTable(
                name: "accident_108");

            migrationBuilder.DropTable(
                name: "accident_109");

            migrationBuilder.DropTable(
                name: "accident_110");

            migrationBuilder.DropTable(
                name: "accident_111");

            migrationBuilder.DropTable(
                name: "accident_112");

            migrationBuilder.DropTable(
                name: "accident_113");
        }
    }
}
