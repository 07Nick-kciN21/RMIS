using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RMIS.Models.Auth;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace RMIS.Data
{
    public static class PermissionSeeder
    {
        // 初始化設定功能
        public static async Task SeedPermissions(AuthDbContext context)
        {
            if (!context.Permissions.Any())
            {
                var permissions = new[]
                {
                    new Permission { Name = "使用者管理"},

                    new Permission { Name = "業務圖資" },
                    new Permission { Name = "業務圖資-道路挖掘科" },
                    new Permission { Name = "業務圖資-道路行政科" },
                    new Permission { Name = "業務圖資-橋梁隧道科" },
                    new Permission { Name = "業務圖資-共同管道科" },
                    new Permission { Name = "業務圖資-路燈工程科" },
                    new Permission { Name = "業務圖資-公園綠地科" },
                    new Permission { Name = "業務圖資-養護工程隊" },
                    new Permission { Name = "業務圖資-道路普查(道路行政科)" },
                    new Permission { Name = "業務圖資-景觀工程科" },
                    new Permission { Name = "業務圖資-內政部警政署" },
                    new Permission { Name = "業務圖資-防災圖層" },
                    new Permission { Name = "業務圖資-其他" },

                    new Permission { Name = "權管土地" },
                    new Permission { Name = "權管土地-桃園市政府養護工程處" },
                    new Permission { Name = "權管土地-公園綠地科" },
                    new Permission { Name = "權管土地-道路行政科" },
                    new Permission { Name = "權管土地-秘書室" },

                    new Permission { Name = "專案查詢" },
                    new Permission { Name = "專案查詢-結果列表編輯" },
                    new Permission { Name = "專案查詢-街景照片編輯" },

                    new Permission { Name = "道路快搜" },

                    new Permission { Name = "屬性搜尋" },
                    new Permission { Name = "屬性搜尋-結果" },
                    new Permission { Name = "屬性搜尋-統計" },

                    new Permission { Name = "正攝影像" },
                    new Permission { Name = "養工焦點" },
                    new Permission { Name = "繪圖板" },
                    new Permission { Name = "測量" },
                    new Permission { Name = "放大" },
                    new Permission { Name = "縮小" }
                };  

                await context.Permissions.AddRangeAsync(permissions);
                await context.SaveChangesAsync();
            }
        }
        //設定Admin使用者
        public static async Task SeedAdminUser(AuthDbContext _AuthDbcontext, UserManager<ApplicationUser> userManager)
        {

            if (!_AuthDbcontext.Users.Any(u => u.Email == "admin@RMIS.com"))
            {
                var adminUser = new ApplicationUser
                {
                    UserName = "Admin",
                    Email = "admin@RMIS.com",
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(adminUser, "Admin@123");
                if (result.Succeeded)
                {
                    // 分配 Admin 角色
                    await userManager.AddToRoleAsync(adminUser, "Admin");
                    await _AuthDbcontext.SaveChangesAsync();
                    Console.WriteLine("Admin 帳戶建立成功，並已分配權限！");
                }
                else
                {
                    Console.WriteLine("[錯誤] 無法建立 Admin 使用者：" + string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                Console.WriteLine("Admin 使用者已存在");
            }

            if (!_AuthDbcontext.Users.Any(u => u.Email == "user2@RMIS.com"))
            {
                var user1 = new ApplicationUser
                {
                    UserName = "User2",
                    Email = "user2@RMIS.com",
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(user1, "User2@123");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user1, "道路挖掘科人員");
                    await _AuthDbcontext.SaveChangesAsync();
                    Console.WriteLine("User1 帳戶建立成功，並已分配權限！");
                }
                else
                {
                    Console.WriteLine("[錯誤] 無法建立 User2 使用者：" + string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                Console.WriteLine("User1 使用者已存在");
            }
        }

        public static async Task SeedRolePermissions(AuthDbContext _AuthDbcontext, RoleManager<ApplicationRole> roleManager)
        {
            // 搜尋admin role
            var adminRole = await roleManager.FindByNameAsync("Admin");
            if (adminRole != null && !_AuthDbcontext.RolePermissions.Any(rp => rp.RoleId == adminRole.Id))
            {
                var allPermissions = await _AuthDbcontext.Permissions.ToListAsync();
                var rolePermissions = allPermissions.Select(p => new RolePermission
                {
                    RoleId = adminRole.Id,
                    PermissionId = p.Id,
                    Read = true,
                    Create = true,
                    Update = true,
                    Delete = true,
                    Export = true
                }).ToList();
                await _AuthDbcontext.AddRangeAsync(rolePermissions);
                Console.WriteLine("[✅] Admin 角色權限已設定");
            }
            else
            {
                Console.WriteLine("[⚠️] Admin 角色已存在");
            }

            var managerRole = await roleManager.FindByNameAsync("管理者");
            if (managerRole != null && !_AuthDbcontext.RolePermissions.Any(rp => rp.RoleId == managerRole.Id))
            {
                var allPermissions = await _AuthDbcontext.Permissions.ToListAsync();
                var rolePermissions = allPermissions.Select(p => new RolePermission
                {
                    RoleId = managerRole.Id,
                    PermissionId = p.Id,
                    Read = true,
                    Create = true,
                    Update = true,
                    Delete = true,
                    Export = true
                }).ToList();
                await _AuthDbcontext.AddRangeAsync(rolePermissions);
                Console.WriteLine("[✅] Manager 角色權限已設定");
            }
            else
            {
                Console.WriteLine("[⚠️] Manager 角色已存在");
            }

            var userRole = await roleManager.FindByNameAsync("使用者");
            if (userRole != null && !_AuthDbcontext.RolePermissions.Any(rp => rp.RoleId == userRole.Id))
            {
                var allPermissions = await _AuthDbcontext.Permissions.ToListAsync();
                var rolePermissions = allPermissions.Select(p => new RolePermission
                {
                    RoleId = userRole.Id,
                    PermissionId = p.Id,
                    Read = true,
                    Create = false,
                    Update = false,
                    Delete = false,
                    Export = false
                }).ToList();
                await _AuthDbcontext.AddRangeAsync(rolePermissions);
                Console.WriteLine("[✅] User 角色權限已設定");
            }
            else
            {
                Console.WriteLine("[⚠️] User 角色已存在");
            }

            await _AuthDbcontext.SaveChangesAsync();
        }
    }
}
