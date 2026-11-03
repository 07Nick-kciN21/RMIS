using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RMIS.Migrations.AuthDb
{
    /// <inheritdoc />
    public partial class AddVwUserAuthInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"CREATE VIEW dbo.vw_UserAuthInfo AS
                SELECT u.Id            AS UserId,
                       u.UserName, u.DisplayName, u.Email, u.PhoneNumber, u.CitizenCardNo,
                       u.[Order]       AS UserOrder,
                       u.Status        AS UserStatus,
                       u.EmailConfirmed, u.CreatedAt,
                       u.DepartmentId,
                       d.Name          AS DepartmentName,
                       d.Status        AS DeptStatus,
                       d.[Order]       AS DeptOrder,
                       r.Id            AS RoleId,
                       r.Name          AS RoleName,
                       r.Status        AS RoleStatus,
                       r.[Order]       AS RoleOrder
                FROM dbo.AspNetUsers u
                LEFT JOIN dbo.Departments d ON d.Id = u.DepartmentId
                OUTER APPLY (
                    SELECT TOP 1 ar.Id, ar.Name, ar.Status, ar.[Order]
                    FROM dbo.AspNetUserRoles ur
                    JOIN dbo.AspNetRoles ar ON ar.Id = ur.RoleId
                    WHERE ur.UserId = u.Id
                    ORDER BY ar.[Order]
                ) r;");   // 貼上第 1 步的 SQL
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW IF EXISTS dbo.vw_UserAuthInfo;");
        }
    }
}
