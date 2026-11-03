using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations.AuthDb
{
    /// <inheritdoc />
    public partial class AddVwRolePermissionDetail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"CREATE VIEW dbo.vw_RolePermissionDetail AS
        SELECT r.Id          AS RoleId,
               r.Name        AS RoleName,
               r.Status      AS RoleStatus,
               r.[Order]     AS RoleOrder,
               p.Id          AS PermissionId,
               p.Name        AS PermissionName,
               p.Status      AS PermissionStatus,
               p.[Order]     AS PermissionOrder,
               CAST(CASE WHEN rp.RoleId IS NULL THEN 0 ELSE 1 END AS bit) AS IsAssigned,
               ISNULL(rp.[Read],   CAST(0 AS bit)) AS [Read],
               ISNULL(rp.[Create], CAST(0 AS bit)) AS [Create],
               ISNULL(rp.[Update], CAST(0 AS bit)) AS [Update],
               ISNULL(rp.[Delete], CAST(0 AS bit)) AS [Delete],
               ISNULL(rp.[Export], CAST(0 AS bit)) AS [Export]
        FROM dbo.AspNetRoles r
        CROSS JOIN dbo.Permissions p
        LEFT JOIN dbo.RolePermissions rp
               ON rp.RoleId = r.Id AND rp.PermissionId = p.Id;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW IF EXISTS dbo.vw_RolePermissionDetail;");
        }
    }
}
