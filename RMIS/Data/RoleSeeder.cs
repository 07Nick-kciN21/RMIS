using Microsoft.AspNetCore.Identity;
using RMIS.Models.Auth;
using System;
using System.Threading.Tasks;
namespace RMIS.Data
{
    public class RoleSeeder
    {
        public static async Task InitializeRoles(IServiceProvider serviceProvider)
        {
            try
            {
                var roleManager = serviceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

                string[] roles = { "Admin", "使用者", "管理者" };
                foreach (var role in roles)
                {
                    if (!await roleManager.RoleExistsAsync(role))
                    {
                        await roleManager.CreateAsync(new ApplicationRole { Name = role });
                        Console.WriteLine($"角色 {role} 已建立");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[錯誤] InitializeRoles失敗: {ex.Message}");
            }
        }
    }
}
