using Azure.Core;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Win32;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using System;

namespace RMIS.Repositories
{
    public class PortalRepository : PortalInterface
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;

        public PortalRepository(
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            AuthDbContext authDbContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
        }

        public async Task<Dictionary<string, object>> RegisterSelectListAsync()
        {
            // 取得部門清單
            var departments = await _authDbContext.Departments
                .Where(d => d.Status)
                .OrderBy(d => d.Order)
                .Select(d => new { d.Id, d.Name })
                .ToListAsync();
            // 取得角色清單
            var roles = await _roleManager.Roles
                .Where(r => r.Status)
                .OrderBy(r => r.Order)
                .Select(r => new { r.Id, r.Name })
                .ToListAsync();

            return new Dictionary<string, object>
            {
                { "Departments", departments },
                { "Roles", roles }
            };
        }

        public async Task<(bool Success, string Message)> RegisterAsync(RegisterView user)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var existUser = await _userManager.FindByNameAsync(user.Account);

                if (existUser != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"帳號已被註冊");
                }

                var existEmailUser = await _userManager.FindByEmailAsync(user.Email);
                if (existEmailUser != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "信箱已被註冊");
                }

                // 取得最大排序值
                int maxOrder = await _authDbContext.Users.MaxAsync(u => (int?)u.Order) ?? 0;
                
                var createUser = new ApplicationUser
                {
                    DisplayName = user.DisplayName,
                    UserName = user.Account,
                    PhoneNumber = user.Phone,
                    Email = user.Email,
                    EmailConfirmed = false, // ✅ 預設 Email 已確認
                    Status = false,
                    DepartmentId = user.DepartmentId,
                    Order = maxOrder + 1,
                };

                var result = await _userManager.CreateAsync(createUser, user.Password);

                if (result.Succeeded)
                {
                    var role = await _roleManager.FindByIdAsync(user.RoleId);
                    await _userManager.AddToRoleAsync(createUser, role.Name);
                    await _authDbContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return (true, "使用者建立成功");
                }
                else
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    string errors = string.Join("; ", result.Errors.Select(e => e.Description));
                    return (false, $"使用者建立失敗: {errors}");
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"使用者建立失敗: {ex}");
            }
        }

        // PortalRepository.cs
        public async Task<(bool Success, string Token, string Message)> GenerateResetPasswordTokenAsync(string account)
        {
            try
            {
                var user = await _userManager.FindByNameAsync(account);

                if (user == null)
                {
                    return (false, null, "帳號不存在");
                }

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                return (true, token, "成功產生重設密碼 Token");
            }
            catch (Exception ex)
            {
                return (false, null, $"產生 Token 失敗：{ex.Message}");
            }
        }

    }
}
