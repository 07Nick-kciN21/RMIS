
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account;
using RMIS.Models.Auth;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace RMIS.Repositories
{
    public class AccountRepository : AccountInterface
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;

        public AccountRepository(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
        }

        public async Task<RolePermission> GetUserPermission(string userId, string permissionName)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var roles = await _userManager.GetRolesAsync(user);
            var roleName = roles.First();
            if (roleName == null)
            {
                return new RolePermission { Read = false, Create = false, Delete = false, Export = false, Update = false }; // 默認無權限
            }
            // 取得該role對應的permissionName
            var permission = await _authDbContext.RolePermissions
                .Include(rp => rp.Permission)
                .Include(rp => rp.Role)
                .FirstAsync(rp => rp.Role.Name == roleName &&
                             rp.Permission.Name == permissionName);

            return permission ?? new RolePermission { Read = false, Create = false, Delete = false, Export = false, Update = false }; // 默認無權限
        }

        public async Task<bool> CreatePermissionAsync(NewPermission newPermission)
        {
            var permission = new Permission { Name = newPermission.Name };
            _authDbContext.Permissions.Add(permission);
            await _authDbContext.SaveChangesAsync();

            // 建立新權限後，預設所有角色的權限為 false
            var roles = await _authDbContext.Roles.ToListAsync();
            foreach (var role in roles)
            {
                var rolePermission = new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = permission.Id,
                    Read = false,
                    Create = false,
                    Delete = false,
                    Export = false,
                    Update = false
                };
                _authDbContext.RolePermissions.Add(rolePermission);
            }
            var rowEffected = await _authDbContext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteUserAsync(string UserId)
        {
            // 檢查被刪除的使用者是否存在
            var user = await _userManager.FindByIdAsync(UserId);

            if(user == null)
            {
                return false;
            }

            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Any())
            {
                await _userManager.RemoveFromRolesAsync(user, roles);
            }

            var result = await _userManager.DeleteAsync(user);
            return result.Succeeded;
        }

        public async Task<bool> UpdateUserAsync(UpdateUser updateUser)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(updateUser.UserId);
                // 切換role
                var currentRole = await _userManager.GetRolesAsync(user);
                var role = await _roleManager.FindByIdAsync(updateUser.RoleId);
                await _userManager.RemoveFromRoleAsync(user, currentRole.First());
                await _userManager.AddToRoleAsync(user, role.Name);

                // 修改使用者資料
                user.UserName = updateUser.UserName;
                user.DepartmentId = updateUser.DepartmentId; // 確保 User 類別有 `DepartmentId`
                user.Status = updateUser.Status; // 確保 User 類別有 `Status` 欄位

                var result = await _userManager.UpdateAsync(user);
                return result.Succeeded;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
            return false;
        }

        public async Task<(bool Success, string Message)> CreateUserAsync(CreateUser createUser)
        {
            try
            {
                var user = new ApplicationUser
                {
                    UserName = createUser.Name,
                    PhoneNumber = createUser.Phone,
                    Email = createUser.Email,
                    EmailConfirmed = true, // ✅ 預設 Email 已確認
                    DepartmentId = 4
                };

                var result = await _userManager.CreateAsync(user, createUser.Password);

                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(user, "使用者");
                    await _authDbContext.SaveChangesAsync();
                    await _signInManager.SignInAsync(user, isPersistent: false);

                    return (true, "使用者建立成功");
                }
                else
                {
                    string errors = string.Join("; ", result.Errors.Select(e => e.Description));
                    return (false, $"使用者建立失敗: {errors}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return (false, $"使用者建立失敗: {ex}");
            }
        }

        public async Task<UpdateRolePermission> GetUpdateRolePermissionsAsync()
        {
            var roles = await _authDbContext.Roles.Select(r => r.Name).ToListAsync();
            var adminRole = await _authDbContext.Roles.Where(r => r.Name == "Admin").FirstAsync();
            var updateRole = new UpdateRolePermission
            {
                Roles = roles,
                RoleId = adminRole.Id,
                RoleName = adminRole.Name,
                Permissions = await _authDbContext.RolePermissions
                        .Where(rp => rp.RoleId == adminRole.Id)
                        .Select(rp => new UpsatePermission
                        {
                            PermissionName = rp.Permission.Name,
                            Read = rp.Read,
                            Create = rp.Create,
                            Update = rp.Update,
                            Delete = rp.Delete,
                            Export = rp.Export
                        })
                        .ToListAsync()
            };
            return updateRole;
        }

        public async Task<bool> UpdateRolePermissionsAsync(UpdateRolePermission updateRoles)
        {
            try
            {
                var rolePermissions = await _authDbContext.RolePermissions
                .Where(rp => rp.RoleId == updateRoles.RoleId)
                .Include(rp => rp.Permission)
                .ToListAsync();
                foreach (var permission in updateRoles.Permissions)
                {
                    var existingPermission = rolePermissions.FirstOrDefault(rp => rp.Permission.Name == permission.PermissionName);
                    if (existingPermission != null)
                    {
                        existingPermission.Read = permission.Read;
                        existingPermission.Create = permission.Create;
                        existingPermission.Update = permission.Update;
                        existingPermission.Delete = permission.Delete;
                        existingPermission.Export = permission.Export;
                    }
                }

                var roweffected = await _authDbContext.SaveChangesAsync();
                return true;
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }

        public async Task<bool> DeletePermissionAsync(int PermissionId)
        {
            // 刪除與role的關聯
            var permissions = await _authDbContext.RolePermissions.Where(rp => rp.PermissionId == PermissionId).ToListAsync();
            _authDbContext.RolePermissions.RemoveRange(permissions);

            // 刪除Permission
            var permission = await _authDbContext.Permissions.FindAsync(PermissionId);
            _authDbContext.Permissions.Remove(permission);
            await _authDbContext.SaveChangesAsync();
            return true;
        }

        public Task<bool> DeleteRoleAsync(string RoleId)
        {
            throw new NotImplementedException();
        }

        public async Task<List<DepartmentUser>> GetDepartmentUser(int departmentId)
        {
            var users = await _authDbContext.Users
                .Where(u => u.DepartmentId == departmentId)
                .OrderBy(u => u.Order)
                .Select(u => new DepartmentUser
                    {
                        Id = u.Id,
                        Department = u.Department.Name,
                        Name = u.UserName,
                        Role = _userManager.GetRolesAsync(u).Result.First(),
                        Status = u.Status,
                        CreateAt = u.CreatedAt
                    }
                ).ToListAsync();
            return users;
        }

        public async Task<List<DepartmentUser>> GetAllUser()
        {
            var users = await _authDbContext.Users
                .OrderBy(u => u.Order)
                .Select(u => new DepartmentUser
                {
                    Id = u.Id,
                    Name = u.UserName,
                    DepartmentId = u.DepartmentId,
                    Department = u.Department.Name,
                    Role = _userManager.GetRolesAsync(u).Result.First(),
                    Status = u.Status,
                    CreateAt = u.CreatedAt
                }
                ).ToListAsync();
            return users;
        }
    }
}
