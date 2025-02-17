using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Auth;
using System.Reflection.Emit;

public class AuthDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
    {
    }

    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<Department> Departments { get; set; }
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // 設定 RolePermission 關聯
        builder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        builder.Entity<RolePermission>()
            .HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions) // ✅ 明確指定關聯
            .HasForeignKey(rp => rp.RoleId)
            .OnDelete(DeleteBehavior.Cascade); // ✅ 設定關聯刪除行為

        builder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);

        // 預設值設定
        builder.Entity<RolePermission>()
            .Property(rp => rp.Read)
        .HasDefaultValue(false);

        builder.Entity<RolePermission>()
            .Property(rp => rp.Create)
            .HasDefaultValue(false);

        builder.Entity<RolePermission>()
            .Property(rp => rp.Update)
            .HasDefaultValue(false);

        builder.Entity<RolePermission>()
            .Property(rp => rp.Delete)
            .HasDefaultValue(false);

        builder.Entity<RolePermission>()
            .Property(rp => rp.Export)
            .HasDefaultValue(false);
    }
}
