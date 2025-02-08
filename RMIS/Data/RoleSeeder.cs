using Microsoft.AspNetCore.Identity;
using System;
using System.Threading.Tasks;
namespace RMIS.Data
{
    public class RoleSeeder
    {
        public static async Task InitializeRoles(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            string[] roles = { "Admin", "User", "Manager" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                    Console.WriteLine($"角色 {role} 已建立");
                }
            }
        }
    }
}
