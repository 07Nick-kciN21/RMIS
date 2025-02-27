
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
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
            Console.WriteLine("DeleteUserAsync");
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
                user.NormalizedUserName = updateUser.UserName.ToUpper();
                user.DepartmentId = updateUser.DepartmentId; // 確保 User 類別有 `DepartmentId`
                user.Status = updateUser.Status; // 確保 User 類別有 `Status` 欄位
                user.PhoneNumber = updateUser.Phone;
                user.Email = updateUser.Email;
                user.NormalizedEmail = updateUser.Email?.ToUpper();
                var result = await _userManager.UpdateAsync(user);
                return result.Succeeded;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }

        public async Task<(bool Success, string Message)> CreateUserAsync(CreateUser createUser)
        {
            try
            {
                var user = new ApplicationUser
                {
                    DisplayName = createUser.DisplayName,
                    UserName = createUser.Account,
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

        public async Task<ReadRolePermission> GetRolePermissionsAsync(string id)
        {
            var role = await _authDbContext.Roles.FindAsync(id);
            var updatePermission = _authDbContext.RolePermissions
                                .Where(rp => rp.RoleId == id)
                                .Select(rp => new ReadPermission
                                {
                                    PermissionName = rp.Permission.Name,
                                    Create = rp.Create,
                                    Read = rp.Read,
                                    Delete = rp.Delete,
                                    Update = rp.Update,
                                    Export = rp.Export
                                }).ToList();
            var updateRole = new ReadRolePermission
            {
                RoleName = role.Name,
                Permissions = updatePermission
            };
            return updateRole;
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

        public async Task<UserManager> GetUserManagerDataAsync()
        {
            var users = await _authDbContext.Users
                .OrderBy(u => u.Department.Order)
                .Select(u => new UserData
                {
                    Id = u.Id,
                    DepartmentId = u.DepartmentId,
                    Department = u.Department.Name,
                    Name = u.UserName,
                    Email = u.Email,
                    Phone = u.PhoneNumber,
                    RoleId = _authDbContext.UserRoles
                                .Where(ur => ur.UserId == u.Id)
                                .Select(ur => ur.RoleId)
                                .First(),
                    Role = _userManager.GetRolesAsync(u).Result.First(),
                    Status = u.Status,
                    CreateAt = u.CreatedAt
                }).ToListAsync();

            var departments = await _authDbContext.Departments
                .OrderBy(u => u.Order)
                .Select(d => new UserDepartment
                {
                    Id = d.Id,
                    Name = d.Name
                }
            ).ToListAsync();

            var roles = await _authDbContext.Roles
                .OrderBy(r => r.Order)
                .Select(r =>
                new UserRole
                {
                    Id = r.Id,
                    Name = r.Name
                }
            ).ToListAsync();
            // 建立 UserManagerView 物件
            var UserManagerData = new UserManager
            {
                Users = users,
                Roles = roles,
                Departments = departments
            };

            return UserManagerData;
        }

        public async Task<DepartmentManager> GetDepartmentManagerDataAsync()
        {
            var departments = await _authDbContext.Departments
                .OrderBy(d => d.Order)
                .Select(d => new DepartmentData
                {
                    Id = d.Id,
                    Name = d.Name,
                    Status = d.Status,
                    CreateAt = d.CreatedAt
                }).ToListAsync();
            var DepartmentManagerData = new DepartmentManager
            {
                Departments = departments
            };
            return DepartmentManagerData;
        }

        public async Task<bool> UpdateDepartmentAsync(UpdateDepartment updateDepartment)
        {
            try
            {
                var department = await _authDbContext.Departments.FindAsync(updateDepartment.Id);

                // 修改使用者資料
                department.Name = updateDepartment.Name;
                department.Status = updateDepartment.Status; // 確保 User 類別有 `Status` 欄位
                _authDbContext.Departments.Update(department);
                int changes = await _authDbContext.SaveChangesAsync(); // 🚀 儲存變更

                return changes > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }

        public async Task<(bool Success, string Message)> DeleteDepartmentAsync(int departmentId)
        {
            try
            {
                var department = await _authDbContext.Departments.Include(d => d.Users).FirstAsync(d => d.Id == departmentId);
                if(department == null)
                {
                    return (false, "該部門不存在");
                }
                var c = department.Users.Count;
                if (department.Users.Count > 0)
                {
                    return (false, "無法刪除部門，請先移除或轉移所有關聯的使用者");
                }
                _authDbContext.Departments.Remove(department);
                await _authDbContext.SaveChangesAsync();
                return (true, "部門刪除成功");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return (false, $"刪除失敗{ex}");
            }
        }

        public async Task<GetRolePermission> GetRolePermissionAsync(string roleName)
        {
            var role = await _authDbContext.Roles.Where(r => r.Name == roleName).FirstOrDefaultAsync();
            if (role == null)
            {
                return null;
            }
            var permissions = await _authDbContext.RolePermissions
                .Where(rp => rp.RoleId == role.Id)
                .Select(rp => new GetPermission
                {
                    PermissionName = rp.Permission.Name,
                    Read = rp.Read,
                    Create = rp.Create,
                    Update = rp.Update,
                    Delete = rp.Delete,
                    Export = rp.Export
                })
                .ToListAsync();
            var rolePermissions = new GetRolePermission
            {
                RoleId = role.Id,
                RoleName = role.Name,
                Permissions = permissions
            };
            return rolePermissions;
        }

        public async Task<RoleManager> GetRoleManagerDataAsync()
        {
            var roles = await _authDbContext.Roles
                .OrderBy(r => r.Order)
                .Select(r => new RoleData
                {
                    Id = r.Id,
                    Name = r.Name,
                    Status = r.Status,
                    CreateAt = r.CreatedAt,
                    permissions = _authDbContext.RolePermissions
                                    .Where(rp => rp.RoleId == r.Id)
                                    .Select(rp => new RolePermissionData
                                    {
                                        Name = rp.Permission.Name,
                                        Create = rp.Create,
                                        Read = rp.Read,
                                        Delete = rp.Delete,
                                        Update = rp.Update,
                                        Export = rp.Export
                                    }).ToList()
                }).ToListAsync();
            var roleManagerData = new RoleManager
            {
                Roles = roles
            };
            return roleManagerData;
        }

        public async Task<UpdateRoleView> UpdateRoleViewAsync(string id)
        {
            var role = _authDbContext.Roles.Find(id);
            var permissions = await _authDbContext.RolePermissions
                .Where(rp => rp.RoleId == id)
                .Select(rp => new UpdatePermission
                {
                    PermissionId = rp.PermissionId,
                    PermissionName = rp.Permission.Name,
                    Create = rp.Create,
                    Read = rp.Read,
                    Delete = rp.Delete,
                    Update = rp.Update,
                    Export = rp.Export
                }).ToListAsync();
            var roleData = new UpdateRoleView
            {
                RoleId = id,
                RoleName = role.Name,
                Status = role.Status,
                Permissions = permissions
            };

            return roleData;
        }

        public async Task<(bool Success, string Message)> UpdateRoleAsync(UpdateRoleView input)
        {
            try
            {
                var role = await _authDbContext.Roles.FindAsync(input.RoleId);
                var rolePermission = await _authDbContext.RolePermissions.Where(p => p.RoleId == input.RoleId).ToListAsync();
                role.Status = input.Status;
                role.Name = input.RoleName;
                foreach(var permission in input.Permissions)
                {
                    var oldPermission = rolePermission.FirstOrDefault(p => p.PermissionId == permission.PermissionId);
                    oldPermission.Read = permission.Read;
                    oldPermission.Update = permission.Update;
                    oldPermission.Create = permission.Create;
                    oldPermission.Delete = permission.Delete;
                    oldPermission.Export = permission.Export;
                }
                await _authDbContext.SaveChangesAsync();
                return (true, $"身分更新成功");
            }
            catch(Exception ex)
            {
                return (false, $"身分更新失敗: {ex}");
            }
        }
    }
}
