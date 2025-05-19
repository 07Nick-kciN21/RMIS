using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using RMIS.Data;
using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Mapdatas;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using RMIS.Models.sql;
using System.Data;
using static RMIS.Controllers.HomeController;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace RMIS.Repositories
{
    public class AccountRepository : AccountInterface
    {       
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;
        private readonly MapDBContext _mapDBContext;

        public AccountRepository(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext, MapDBContext mapDBContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
            _mapDBContext = mapDBContext;
        }

        public async Task<bool> CheckStatus(ApplicationUser user)
        {
            var userStatus = user.Status;

            var roles = await _userManager.GetRolesAsync(user);
            var roleName = roles.First();
            var role = await _roleManager.FindByNameAsync(roleName);
            var roleStatus = role.Status;

            var department = await _authDbContext.Departments.FindAsync(user.DepartmentId);
            var deptStatus = department.Status;
            return (userStatus && roleStatus && deptStatus);
        }

        public async Task<Dictionary<string, PermissionDetail>> GetUserPermissions(string roleId)
        {
            var permissions = await _authDbContext.RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();

            return permissions.ToDictionary(
                p => p.Permission.Name,
                p => new PermissionDetail
                {
                    Status = p.Permission.Status,
                    Read = p.Read,
                    Create = p.Create,
                    Update = p.Update,
                    Delete = p.Delete,
                    Export = p.Export
                });
        }

        public async Task<UserAuthInfo> GetUserAuthInfo(ApplicationUser user)
        {
            var department = await _authDbContext.Departments
                .Where(d => d.Id == user.DepartmentId)
                .FirstAsync();

            var roles = await _userManager.GetRolesAsync(user);
            var roleName = roles.First();
            var role = await _roleManager.FindByNameAsync(roleName);
            var result = new UserAuthInfo
            {
                departmentId = department.Id,
                departmentName = department.Name,
                deptStatus = department.Status,
                roleId = role.Id,
                roleName = role.Name,
                roleStatus = role.Status
            };
            
            return result;
        }
        public async Task<RolePermission> GetUserPermission(string userId, string permissionName)
        {
            var user = await _userManager.FindByIdAsync(userId);
            var roles = await _userManager.GetRolesAsync(user);
            var roleName = roles.First();
            var role = await _roleManager.FindByNameAsync(roleName);
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

        public async Task<string> GetUserDemartment(ApplicationUser user)
        {

            var department = await _authDbContext.Departments
                .Where(d => d.Id == user.DepartmentId)
                .Select(d => d.Name)
                .FirstAsync();
            return department;
        }

        public async Task<(bool Success, string Message)> CreatePermissionAsync(CreatePermissionView createPermission)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                // 確認是否存在同名權限
                var existPermission = await _authDbContext.Permissions.FirstOrDefaultAsync(p => p.Name == createPermission.Name);
                if(existPermission != null)
                {
                    await transaction.RollbackAsync();
                    return (false, "同名權限以存在");
                }
                int maxOrder = await _authDbContext.Permissions.MaxAsync(p => (int?)p.Order) ?? 0;
                var permission = new Permission
                {
                    Name = createPermission.Name,
                    Order = maxOrder + 1,
                    Status = createPermission.Status
                };
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
                await transaction.CommitAsync();
                return (true, "新增權限成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"新增權限失敗: {ex}");
            }
        }

        public async Task<(bool Success, string Message)> DeleteUserAsync(string UserId)
        {
            // 檢查被刪除的使用者是否存在
            var user = await _userManager.FindByIdAsync(UserId);

            if (user == null)
            {
                return (false, "使用者不存在或已被刪除" + UserId); // 使用者不存在或已被刪除
            }
            if(user.IsSystemProtected)
            {
                return (false, $"無法刪除系統保護的使用者 {user.UserName}");
            }
            Console.WriteLine("DeleteUserAsync");
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Any())
            {
                await _userManager.RemoveFromRolesAsync(user, roles);
            }

            var result = await _userManager.DeleteAsync(user);
            return (true, "使用者刪除成功");
        }

        public async Task<(bool Success, string Message)> UpdateUserAsync(UpdateUserView updateUser)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var user = await _userManager.FindByIdAsync(updateUser.UserId);
                if (user == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"找不到為 {updateUser.UserName} 的使用者");
                }
                if(user.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的使用者 {user.UserName}");
                }
                // 取得使用者當前的角色
                var currentRoles = await _userManager.GetRolesAsync(user);
                var existingRole = currentRoles.FirstOrDefault(); // 避免 First() 取不到值拋錯

                // 取得新角色
                var role = await _roleManager.FindByIdAsync(updateUser.RoleId);
                Console.WriteLine(role);
                if (role == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"找不到為 {role.Name} 的角色");
                }

                // 移除舊角色（如果有的話）
                if (!string.IsNullOrEmpty(existingRole))
                {
                    var removeResult = await _userManager.RemoveFromRoleAsync(user, existingRole);
                    if (!removeResult.Succeeded)
                    {
                        await transaction.RollbackAsync();
                        _authDbContext.ChangeTracker.Clear();
                        return (false, $"無法移除角色 {existingRole}，錯誤: {string.Join(", ", removeResult.Errors.Select(e => e.Description))}");
                    }
                }

                // 新增新角色
                var addResult = await _userManager.AddToRoleAsync(user, role.Name);
                if (!addResult.Succeeded)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法新增角色 {role.Name}，錯誤: {string.Join(", ", addResult.Errors.Select(e => e.Description))}");
                }

                // **檢查角色是否切換成功**
                var updatedRoles = await _userManager.GetRolesAsync(user);
                if (!updatedRoles.Contains(role.Name))
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"角色切換失敗，使用者未成功加入角色 {role.Name}");
                }

                Console.WriteLine($"角色切換成功！使用者 {user.UserName} 目前的角色為: {string.Join(", ", updatedRoles)}");


                // 修改使用者資料
                user.UserName = updateUser.UserName;
                user.NormalizedUserName = updateUser.UserName.ToUpperInvariant();
                user.DisplayName = updateUser.DisplayName;
                user.DepartmentId = updateUser.DepartmentId; // 確保 User 類別有 `DepartmentId`
                user.Status = updateUser.Status; // 確保 User 類別有 `Status` 欄位
                user.PhoneNumber = updateUser.Phone;
                user.Email = updateUser.Email;
                user.NormalizedEmail = updateUser.Email?.ToUpper();
                var result = await _userManager.UpdateAsync(user);
                if (result.Succeeded)
                {
                    Console.WriteLine("使用者修改成功");
                    await transaction.CommitAsync();
                    return (true, "使用者修改成功");
                }
                else
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "使用者修改失敗");
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, $"使用者修改失敗: {ex}");
            }
        }

        public async Task<(bool Success, string Message)> CreateUserAsync(CreateUser user)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                // 確認該帳號不存在
                var existUser = await _userManager.FindByNameAsync(user.Account);
                if (existUser != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "帳號已存在");
                }
                // 取得最大排序值
                var maxOrder = await _authDbContext.Users.MaxAsync(u => (int?)u.Order) ?? 0;

                var createUser = new ApplicationUser
                {
                    Id = Guid.NewGuid().ToString(),
                    DisplayName = user.DisplayName,
                    UserName = user.Account,
                    PhoneNumber = user.Phone,
                    Email = user.Email,
                    EmailConfirmed = true, // ✅ 預設 Email 已確認
                    DepartmentId = user.DepartmentId,
                    Status = user.Status,
                    Order = maxOrder + 1,
                };

                var result = await _userManager.CreateAsync(createUser, user.Password);

                if (result.Succeeded)
                {
                    var role = await _roleManager.FindByIdAsync(user.RoleId);
                    var addResult = await _userManager.AddToRoleAsync(createUser, role.Name);
                    if (!addResult.Succeeded)
                    {
                        await transaction.RollbackAsync();
                        _authDbContext.ChangeTracker.Clear();
                        return (false, $"身分賦予失敗");
                    }
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
                Console.WriteLine(ex);
                return (false, $"使用者建立失敗: {ex}");
            }
        }

        public async Task<ReadRolePermission> GetRolePermissionsAsync(string id)
        {
            var role = await _authDbContext.Roles.FindAsync(id);
            var updatePermission = _authDbContext.RolePermissions
                                .Include(rp => rp.Permission)
                                .Where(rp => rp.RoleId == id)
                                .OrderBy(rp => rp.Permission.Order)
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
        public async Task<(bool Success, string Message)> DeletePermissionAsync(int PermissionId)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                // 刪除與role的關聯
                var permissions = await _authDbContext.RolePermissions.Where(rp => rp.PermissionId == PermissionId).ToListAsync();
                if (permissions.Count == 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "找不到與身分的關聯");
                }
                _authDbContext.RolePermissions.RemoveRange(permissions);

                // 刪除Permission
                var permission = await _authDbContext.Permissions.FindAsync(PermissionId);
                if (permission.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "無法刪除由系統保護的權限");
                }
                if (permission == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "權限不存在");
                }
                _authDbContext.Permissions.Remove(permission);
                await _authDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "權限刪除成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"刪除權限失敗: {ex}");
            }
        }

        public async Task<(bool Success, string Message)> DeleteRoleAsync(string RoleId)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var role = await _roleManager.FindByIdAsync(RoleId);

                if(role.IsSystemProtected) 
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法刪除系統保護的身分 {role.Name}");
                }

                var roleUsers = await _userManager.GetUsersInRoleAsync(role.Name);

                if (roleUsers.Count > 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "該身分還有使用者無法刪除");
                }
                var permissions = await _authDbContext.RolePermissions.Where(rp => rp.RoleId == RoleId).ToListAsync();
                if (permissions == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "身分沒有權限可刪除");
                }
                _authDbContext.RemoveRange(permissions);
                await _authDbContext.SaveChangesAsync();

                if (role == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "身分不存在，無法刪除");
                }
                var delete = await _roleManager.DeleteAsync(role);
                if (!delete.Succeeded)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "身分刪除失敗");
                }
                await transaction.CommitAsync();
                return (true, "身分刪除成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"身分刪除失敗{ex}");
            }
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
                .Include(u => u.Department)                
                .Include(u => u.UserRoles)
                .OrderBy(u => u.Department.Order)
                .ThenBy(u => u.UserRoles
                    .Select(ur => _authDbContext.Roles
                        .Where(r => r.Id == ur.RoleId)
                        .Select(r => r.Order)
                        .FirstOrDefault())
                    .FirstOrDefault())
                .ThenBy(u => u.Order) // 最後按照 User.Order 排序
                .Select(u => new UserData
                {
                    Id = u.Id,
                    DepartmentId = u.DepartmentId,
                    Department = u.Department.Name,
                    UserName = u.UserName,
                    DisplayName = u.DisplayName,
                    Email = u.Email,
                    Phone = u.PhoneNumber,
                    RoleId = _authDbContext.UserRoles
                                .Where(ur => ur.UserId == u.Id)
                                .Select(ur => ur.RoleId)
                                .First(),
                    Role = _userManager.GetRolesAsync(u).Result.First(),
                    Order = u.Order,
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

        public async Task<(bool Success, string Message)> UpdateDepartmentAsync(UpdateDepartmentView updateDepartment)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var department = await _authDbContext.Departments.FindAsync(updateDepartment.Id);
                if (department == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "部門不存在");
                }
                if(department.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的部門 {department.Name}");
                }
                // 修改使用者資料
                department.Name = updateDepartment.Name;
                department.Status = updateDepartment.Status;
                _authDbContext.Departments.Update(department);
                
                int pipelineAdd = 0;
                int pipelineRemove = 0;
                var affectedCategories = new HashSet<Guid>();
                if (updateDepartment.Removed != null)
                {
                    foreach (var remove in updateDepartment.Removed)
                    {
                        var pipeline = await _mapDBContext.Pipelines.FindAsync(remove);
                        pipeline.DepartmentIds.Remove(updateDepartment.Id);
                        _mapDBContext.Pipelines.Update(pipeline);
                        // 記錄會受影響的父Category
                        affectedCategories.Add(pipeline.CategoryId);
                    }
                    pipelineRemove = await _mapDBContext.SaveChangesAsync();
                }
                if (updateDepartment.Added != null)
                {
                    _authDbContext.Departments.Update(department);
                    foreach (var add in updateDepartment.Added)
                    {
                        var pipeline = await _mapDBContext.Pipelines.FindAsync(add);
                        pipeline.DepartmentIds.Add(updateDepartment.Id);
                        _mapDBContext.Pipelines.Update(pipeline);
                        // 記錄會受影響的父Category
                        affectedCategories.Add(pipeline.CategoryId);
                    }
                    pipelineAdd = await _mapDBContext.SaveChangesAsync();
                }

                // 回推：對所有受影響的分類，進行完整上層遞迴修正
                var visited = new HashSet<Guid>();
                foreach (var categoryId in affectedCategories)
                {
                    await RecalculateCategoryDepartmentsUpward(categoryId, visited);
                }

                var departmentUpdate = await _authDbContext.SaveChangesAsync();
                if (departmentUpdate == 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"部門修改失敗");
                }
                await transaction.CommitAsync();
                return (true, $"部門修改成功，新增{pipelineAdd}個、移除{pipelineRemove}個部門權限，");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "部門修改失敗");
            }
        }

        private async Task<List<int>> RecalculateCategoryDepartmentsUpward(Guid categoryId, HashSet<Guid> visited)
        {
            if (visited.Contains(categoryId)) return new List<int>();
            visited.Add(categoryId);

            var category = await _mapDBContext.Categories.FindAsync(categoryId);
            if (category == null) return new List<int>();
            Console.WriteLine($"搜尋類別 {category.Name}");
            // 🔹 1. 直屬 pipelines 的 departmentIds
            var pipelines = await _mapDBContext.Pipelines
                .Where(p => p.CategoryId == categoryId)
                .ToListAsync();

            var pipelineDeptIds = pipelines
                .SelectMany(p => p.DepartmentIds)
                .ToList();

            // 🔹 2. 直屬子 categories 的 departmentIds
            var childCategories = await _mapDBContext.Categories
                .Where(c => c.ParentId == categoryId)
                .ToListAsync();

            var childDeptIds = childCategories
                .SelectMany(c => c.DepartmentIds)
                .ToList();

            // 🔹 3. 合併後設回本分類
            var combined = pipelineDeptIds.Concat(childDeptIds).Distinct().ToList();
            category.DepartmentIds = combined;
            _mapDBContext.Categories.Update(category);
            await _mapDBContext.SaveChangesAsync();

            // 🔼 4. 繼續往上更新 parent
            if (category.ParentId.HasValue)
            {
                await RecalculateCategoryDepartmentsUpward(category.ParentId.Value, visited);
            }

            return combined;
        }

        public async Task<(bool Success, string Message)> DeleteDepartmentAsync(int departmentId)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var department = await _authDbContext.Departments.Include(d => d.Users).FirstAsync(d => d.Id == departmentId);
                if (department == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "該部門不存在");
                }
                if(department.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法刪除系統保護的部門 {department.Name}");
                }
                if (department.Users.Count > 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "無法刪除部門，請先移除或轉移所有關聯的使用者");
                }
                _authDbContext.Departments.Remove(department);
                var delete = await _authDbContext.SaveChangesAsync();
                if(delete == 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"刪除失敗");
                }
                await transaction.CommitAsync();
                return (true, "部門刪除成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
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
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == id)
                .OrderBy(rp => rp.Permission.Order)
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

        public async Task<(bool Success, string Message)> UpdateRoleAsync(UpdateRoleView updaterole)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var role = await _authDbContext.Roles.FindAsync(updaterole.RoleId);
                if(role == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"身分不存在");
                }
                if (role.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的身分 {role.Name}");
                }
                var rolePermission = await _authDbContext.RolePermissions.Where(p => p.RoleId == updaterole.RoleId).ToListAsync();
                role.Status = updaterole.Status;
                role.Name = updaterole.RoleName;
                role.NormalizedName = updaterole.RoleName.ToUpperInvariant();
                foreach (var permission in updaterole.Permissions)
                {
                    var oldPermission = rolePermission.FirstOrDefault(p => p.PermissionId == permission.PermissionId);
                    oldPermission.Read = permission.Read;
                    oldPermission.Update = permission.Update;
                    oldPermission.Create = permission.Create;
                    oldPermission.Delete = permission.Delete;
                    oldPermission.Export = permission.Export;
                }
                await _authDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, $"身分更新成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"身分更新失敗: {ex}");
            }
        }
        public async Task<UserProfileView> GetUserProfileDataAsync(string id)
        {
            var user = await _authDbContext.Users.Include(u => u.Department).FirstAsync(u => u.Id == id);
            var roles = await _authDbContext.Roles.ToListAsync();
            var departments = await _authDbContext.Departments.ToListAsync();
            var userData = new UserProfileView
            {
                Id = user.Id,
                UserName = user.UserName,
                DisplayName = user.DisplayName,
                Email = user.Email,
                Phone = user.PhoneNumber,
                Role = _userManager.GetRolesAsync(user).Result.First(),
                Department = user.Department.Name,
            };
            return userData;
        }

        public async Task<UpdateUserView> UpdateUserViewAsync(string id)
        {
            var user = await _authDbContext.Users.Include(u => u.Department).FirstAsync(u => u.Id == id);
            var roles = await _authDbContext.Roles.ToListAsync();
            var departments = await _authDbContext.Departments.ToListAsync();
            var userData = new UpdateUserView
            {
                UserId = user.Id,
                UserName = user.UserName,
                DisplayName = user.DisplayName,
                Email = user.Email,
                Phone = user.PhoneNumber,
                RoleId = _authDbContext.UserRoles
                            .Where(ur => ur.UserId == user.Id)
                            .Select(ur => ur.RoleId)
                            .First(),
                Roles = new List<SelectListItem>
                {
                    new SelectListItem { Value = "", Text = "請選擇角色", Disabled = true, Selected = true }
                }
                .Concat(roles
                    .OrderBy(r => r.Order)
                    .Select(r => new SelectListItem
                    {
                        Value = r.Id,
                        Text = r.Name
                    })),
                DepartmentId = user.DepartmentId,
                Departments = new List<SelectListItem>
                {
                    new SelectListItem { Value = "", Text = "請選擇部門", Disabled = true, Selected = true }
                }
                .Concat(departments
                    .OrderBy(d => d.Order)
                    .Select(d => new SelectListItem
                    {
                        Value = d.Id.ToString(),
                        Text = d.Name.ToString()
                    })),
                Status = user.Status
            };
            return userData;
        }

        public async Task<UpdateDepartmentView> UpdateDepartmentViewAsync(int id)
        {
            var department = await _authDbContext.Departments.FindAsync(id);
            var departmentData = new UpdateDepartmentView
            {
                Id = department.Id,
                Name = department.Name,
                Status = department.Status
            };
            return departmentData;
        }

        public async Task<PermissionManager> GetPermissionManagerDataAsync()
        {
            var permissions = await _authDbContext.Permissions
                .OrderBy(p => p.Order)
                .Select(p => new PermissionData
                {
                    Id = p.Id,
                    Name = p.Name,
                    Status = p.Status,
                    CreateAt = p.CreatedAt
                }).ToListAsync();
            var PermissionData = new PermissionManager
            {
                Permissions = permissions
            };
            return PermissionData;
        }

        public async Task<UpdatePermissionView> UpdatePermissionViewAsync(int id)
        {
            var permission = await _authDbContext.Permissions.FindAsync(id);
            var permissionData = new UpdatePermissionView
            {
                Id = permission.Id,
                Name = permission.Name,
                Status = permission.Status
            };
            return permissionData;
        }

        public async Task<(bool Success, string Message)> UpdatePermissionAsync(UpdatePermissionView updatePermission)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var permission = await _authDbContext.Permissions.FindAsync(updatePermission.Id);
                if (permission == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "權限不存在");
                }
                if(permission.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的權限 {permission.Name}");
                }
                permission.Name = updatePermission.Name;
                permission.Status = updatePermission.Status;
                _authDbContext.Permissions.Update(permission);
                await _authDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "權限更新成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"權限更新失敗 {ex}");
            }
        }

        public async Task<(bool Success, string Message)> CreateRoleAsync(CreateRoleView createRole)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                // 查看是否有同名角色
                var existRole = await _authDbContext.Roles.FirstOrDefaultAsync(r => r.Name == createRole.RoleName);
                if (existRole != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "角色已存在");
                }

                var roleId = Guid.NewGuid().ToString();
                var role = new ApplicationRole
                {
                    Id = roleId,
                    Name = createRole.RoleName,
                    Status = createRole.Status,
                    Order = _authDbContext.Roles.Count() + 1
                };
                var result = await _roleManager.CreateAsync(role);
                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"身分建立失敗{result.Errors.Select(e => e.Description)}");
                }
                var rolePermissions = new List<RolePermission>();
                foreach (var permission in createRole.Permissions)
                {
                    rolePermissions.Add(new RolePermission
                    {
                        RoleId = roleId,
                        PermissionId = permission.PermissionId,
                        Read = permission.Read,
                        Create = permission.Create,
                        Update = permission.Update,
                        Delete = permission.Delete,
                        Export = permission.Export
                    });
                }
                await _authDbContext.AddRangeAsync(rolePermissions);

                var roweffect = await _authDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "身分建立成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"身分建立失敗{ex}");
            }
        }

        public async Task<(bool Success, string Message)> CreateDepartmentAsync(CreateDepartmentView createDepartment)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                // 查看是否有同名部門
                var existDepartment = await _authDbContext.Departments.FirstOrDefaultAsync(d => d.Name == createDepartment.Name);
                if (existDepartment != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "部門已存在");
                }
                // 取得最大排序值
                int maxOrder = await _authDbContext.Departments.MaxAsync(d => (int?)d.Order) ?? 0;
                _authDbContext.Departments.Add(new Department
                {
                    Name = createDepartment.Name,
                    Status = createDepartment.Status,
                    Order = maxOrder + 1
                });
                int pipelineAdd = 0;
                int pipelineRemove = 0;
                var affectedCategories = new HashSet<Guid>();
                if (createDepartment.Added != null)
                {
                    foreach (var add in createDepartment.Added)
                    {
                        var pipeline = await _mapDBContext.Pipelines.FindAsync(add);
                        pipeline.DepartmentIds.Add(createDepartment.Id);
                        _mapDBContext.Pipelines.Update(pipeline);
                        // 記錄會受影響的父Category
                        affectedCategories.Add(pipeline.CategoryId);
                    }
                    pipelineAdd = await _mapDBContext.SaveChangesAsync();
                }

                // 回推：對所有受影響的分類，進行完整上層遞迴修正
                var visited = new HashSet<Guid>();
                foreach (var categoryId in affectedCategories)
                {
                    await RecalculateCategoryDepartmentsUpward(categoryId, visited);
                }
                await _authDbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "部門建立成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"部門建立失敗{ex}");
            }
        }

        public async Task<MapdataManager> GetMapdataManagerDataAsync()
        {
            var allCategories = await _mapDBContext.Categories.ToListAsync();

            // 儲存類別順序的清單
            var categoryOrderList = new List<Guid>();

            var rootCategories = allCategories
                .Where(c => c.ParentId == null)
                .OrderBy(c => c.OrderId);

            foreach (var category in rootCategories)
            {
                BuildCategoryOrder(category.Id, allCategories, categoryOrderList);
            }

            var pipelines = await _mapDBContext.Pipelines
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.CategoryId
                }).ToListAsync();

            // 用 CategoryId 分組 pipelines
            var pipelinesByCategory = pipelines.GroupBy(p => p.CategoryId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var pipelineData = new List<PipelineData>();

            // 按照 categoryOrderList 順序插入 pipeline
            foreach (var categoryId in categoryOrderList)
            {
                if (pipelinesByCategory.TryGetValue(categoryId, out var pipelist))
                {
                    var categoryName = allCategories.First(c => c.Id == categoryId).Name;
                    foreach (var p in pipelist)
                    {
                        pipelineData.Add(new PipelineData
                        {
                            Id = p.Id,
                            Name = p.Name,
                            Category = categoryName,
                        });
                    }
                }
            }

            var managerData = new MapdataManager
            {
                PipelineDatas = pipelineData
            };
            return managerData;
        }

        // 這個會將 Category 的 Id 加到順序清單中
        private void BuildCategoryOrder(Guid id, List<Category> allCategories, List<Guid> orderList)
        {
            orderList.Add(id); // 儲存順序
            var childCate = allCategories.Where(c => c.ParentId == id).OrderBy(c => c.OrderId).ToList();
            foreach (var c in childCate)
            {
                BuildCategoryOrder(c.Id, allCategories, orderList);
            }
        }

        public async Task<MapdataSearch> GetMapdataSearchAsync(Guid LayerId, string Dist, Guid AreaId)
        {
            var layer = await _mapDBContext.Layers
                .Include(l => l.GeometryType)
                .FirstOrDefaultAsync(l => l.Id == LayerId);
            var dist = await _mapDBContext.AdminDist.FirstOrDefaultAsync(ad => ad.Town == Dist);
            var mapdataSearch = new MapdataSearch
            {
                Id = layer.Id,
                Name = layer.Name,
                Dist = dist.Town,
                Kind = layer.GeometryType.Kind,
                Svg = layer.GeometryType.Svg,
                Color = layer.GeometryType.Color
            };
            if (AreaId == Guid.Empty)
            {
                var areas = await _mapDBContext.Areas
                    .Where(a => a.AdminDist.Town == Dist && a.LayerId == LayerId)
                    .OrderBy(a => a.Name)
                    .Select(a => new MapdataArea
                    {
                        Id = a.Id,
                        Name = a.Name
                    }).ToListAsync();
                mapdataSearch.Areas = areas;
            }
            else
            {
                var areas = await _mapDBContext.Areas
                .Where(a => a.AdminDist.Town == Dist && a.Id == AreaId)
                .OrderBy(a => a.Name)
                .Select(a => new MapdataArea
                {
                    Id = a.Id,
                    Name = a.Name
                }).ToListAsync();
                mapdataSearch.Areas = areas;
            }
            return mapdataSearch;
        }

        public async Task<List<MapdataLayer>> GetMapdataLayersAsync(Guid id)
        {
            var layers = await _mapDBContext.Layers
                .Where(l => l.PipelineId == id)
                .Select(l => new MapdataLayer
                {
                    Id = l.Id,
                    Name = l.Name,
                })
                .ToListAsync();
            return layers;
        }

        public async Task<List<MapdatAdminDist>> GetMapdataDistsAsync(Guid id)
        {
            var dists = await _mapDBContext.Areas
                .Include(a => a.AdminDist)
                .OrderBy(a => a.AdminDist.orderId)
                .Where(a => a.LayerId == id)
                .Select(a => new MapdatAdminDist
                {
                    Id = a.AdminDist.Id,
                    City = a.AdminDist.City,
                    Town = a.AdminDist.Town
                })
                .Distinct()
                .ToListAsync();
            return dists;
        }
        
        public async Task<List<MapdataArea>> GetMapdataAreasAsync(Guid LayerId, string Dist)
        {
            var areas = await _mapDBContext.Areas
                .Include(a => a.AdminDist)
                .Where(a => a.LayerId == LayerId && a.AdminDist.Town == Dist)
                .Select(a => new MapdataArea
                {
                    Id = a.Id,
                    Name = a.Name
                })
                .Distinct()
                .OrderBy(a => a.Name) // ✅ 移到 Distinct() 後面
                .ToListAsync();
            return areas;
        }
        public async Task<List<MapdataPoint>> GetMapdataPointsAsync(Guid areaId)
        {
            var points = await _mapDBContext.Points
                .Where(p => p.AreaId == areaId)
                .OrderBy(p => p.Index)
                .Select(p => new MapdataPoint
                {
                    Index = p.Index,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Property = p.Property
                }).ToListAsync();
            return points;
        }
        public async Task<(bool Success, string Message)> UpdateUserPasswordAsync(UpdateUserPassword updateUserPassword)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var existUser = await _userManager.FindByIdAsync(updateUserPassword.UserId);
                if(existUser == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"帳號不存在");
                }
                if(existUser.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的使用者 {existUser.UserName}");
                }
                bool isOldPasswordCorrect = await _userManager.CheckPasswordAsync(existUser, updateUserPassword.OriginPassword);
                if (!isOldPasswordCorrect)
                {
                    await transaction.RollbackAsync();
                    return (false, "舊密碼輸入錯誤");
                }
                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(existUser);
                var resetResult = await _userManager.ResetPasswordAsync(existUser, resetToken, updateUserPassword.NewPassword);
                if (!resetResult.Succeeded)
                {
                    await transaction.RollbackAsync();
                    return (false, "密碼修改失敗：" + string.Join(", ", resetResult.Errors.Select(e => e.Description)));
                }

                await transaction.CommitAsync();
                return (true, "密碼修改成功");

            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"密碼修改失敗: {ex.Message}");
            }
        }

        public async Task<(bool Success, string? Data, string? Message)> GetPipelineAccessAsync(int id)
        {
            var allCategories = await _mapDBContext.Categories.ToListAsync();
            var jsTreeData = BuildJsTreeData(allCategories, null, id);
            var json = JsonConvert.SerializeObject(jsTreeData);
            return (true, json, null); // 成功時回傳 json 資料
        }
        private List<object> BuildJsTreeData(List<Category> allCategories, Guid? parentId, int deptId)
        {
            var result = new List<object>();
            var currentCategories = allCategories
                .Where(c => c.ParentId == parentId)
                .OrderBy(c => c.OrderId)
                .ToList();

            foreach (var category in currentCategories)
            {
                var categoryNode = new Dictionary<string, object>
                {
                    { "id", category.Id.ToString() },
                    { "text", category.Name },
                    { "parent", parentId.HasValue ? parentId.Value.ToString() : "#" },
                    { "children", new List<object>() },
                    { "tag", "node" }
                };

                // 查找該分類下所有 pipeline（先拉出再做 Contains）
                var currentPipelines = _mapDBContext.Pipelines
                    .Where(p => p.CategoryId == category.Id)
                    .ToList();

                foreach (var pipeline in currentPipelines)
                {
                    var isSelected = pipeline.DepartmentIds.Contains(deptId); // 判斷是否包含該部門
                    var pipelineNode = new Dictionary<string, object>
                    {
                        { "id", pipeline.Id.ToString() },
                        { "text", pipeline.Name },
                        { "parent", category.Id.ToString() },
                        { "children", false },
                        { "tag", "pipeline" }
                    };

                    if (isSelected)
                    {
                        pipelineNode.Add("selected", true);
                    }

                    ((List<object>)categoryNode["children"]).Add(pipelineNode);
                }

                // 遞迴處理子分類
                var childCategories = BuildJsTreeData(allCategories, category.Id, deptId);
                if (childCategories.Any())
                {
                    ((List<object>)categoryNode["children"]).AddRange(childCategories);
                }

                result.Add(categoryNode);
            }

            return result;
        }

        public async Task<(bool Success, string Message)> DeleteMapdataAreaAsync(Guid id)
        {
            var points = await _mapDBContext.Points.Where(p => p.AreaId == id).ToListAsync();
            var area = await _mapDBContext.Areas.FindAsync(id);
            if(area == null)
            {
                return (false, "資料不存在");
            }
            _mapDBContext.RemoveRange(points);
            _mapDBContext.Remove(area);
            await _mapDBContext.SaveChangesAsync();
            return (true, "刪除資料");
        }

        public async Task<UpdatePipelineView> UpdatePupelineViewAsync(Guid id)
        {
            var pipeline = await _mapDBContext.Pipelines.FindAsync(id);
            var pipelineData = new UpdatePipelineView
            {
                Id = pipeline.Id,
                ManagementUnit = pipeline.ManagementUnit,
                Name = pipeline.Name,
                CategoryId = pipeline.CategoryId,
                Categories = new List<SelectListItem>
                {
                    new SelectListItem { Value = "", Text = "請選擇部門", Disabled = true, Selected = true }
                }
                .Concat(_mapDBContext.Categories
                    .Select(c => new SelectListItem
                    {
                        Value = c.Id.ToString(),
                        Text = c.Name
                    })),
                
            };
            return pipelineData;
        }
        public async Task<(bool Success, string Message)> UpdatePupelineAsync(UpdatePipeline updatePipeline)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var pipeline = await _mapDBContext.Pipelines.FindAsync(updatePipeline.Id);
                pipeline.Name = updatePipeline.Name;
                pipeline.CategoryId = updatePipeline.CategoryId;
                pipeline.ManagementUnit = updatePipeline.ManagementUnit;
                _mapDBContext.Pipelines.Update(pipeline);
                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "圖資編輯成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _mapDBContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "部門修改失敗");
            }
        }

        public async Task<(bool Success, string? Data, string Message)> GetDatainfoAsync(Guid id)
        {         
            var pipeline = await _mapDBContext.Pipelines.FindAsync(id);
            if (pipeline == null)
            {
                return (false, null, "圖資不存在");
            }
            if(pipeline.dataInfo == null)
            {
                return (true, null, "沒有詮釋資料");
            }
            return (true, pipeline.dataInfo, "取得詮釋資料");
        }

        public async Task<(bool Success, string Message)> ImportMapdataAsync(ImportMapdataView importMapata)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var dist = await _mapDBContext.AdminDist.FirstOrDefaultAsync(ad => ad.Town == importMapata.District);
                if (dist == null)
                    return (false, "找不到對應的行政區");

                var layerExists = await _mapDBContext.Layers.AnyAsync(l => l.Id == importMapata.LayerId);
                if (!layerExists)
                    return (false, "圖層不存在，無法新增區域");

                foreach (var mapdataArea in importMapata.ImportMapdataAreas)
                {
                    if (mapdataArea.MapdataPoints == null || mapdataArea.MapdataPoints.Count == 0)
                        return (false, $"區域 {mapdataArea.name} 沒有點資料");

                    var areaId = Guid.NewGuid();
                    var area = new Area
                    {
                        Id = areaId,
                        Name = mapdataArea.name,
                        LayerId = importMapata.LayerId,
                        ConstructionUnit = "未填寫",
                        AdminDistId = dist.Id
                    };

                    await _mapDBContext.Areas.AddAsync(area);

                    foreach (var point in mapdataArea.MapdataPoints)
                    {
                        var newPoint = new Point
                        {
                            Id = Guid.NewGuid(),
                            AreaId = areaId,
                            Index = point.Index,
                            Latitude = point.Latitude,
                            Longitude = point.Longitude,
                            Property = point.Property
                        };
                        await _mapDBContext.Points.AddAsync(newPoint);
                    }
                }

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "資料匯入成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _mapDBContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "資料匯入失敗");
            }
        }

        public async Task<(bool Success, string Message)> UpdateDatainfoAsync(UpdateDatainfo updateDatainfo)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var pipeline = await _mapDBContext.Pipelines.FindAsync(updateDatainfo.Id);
                if (pipeline == null)
                {
                    return (false, "圖資不存在");
                }
                pipeline.dataInfo = updateDatainfo.Datainfo;
                _mapDBContext.Pipelines.Update(pipeline);
                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return (true, "詮釋資料修改");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _mapDBContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "詮釋資料修改失敗");
            }
        }
    }
}
