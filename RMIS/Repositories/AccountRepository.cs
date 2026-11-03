using Azure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using RMIS.Models;
using RMIS.Controllers;
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
using System.Text.RegularExpressions;
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
        private readonly ILogger<AccountRepository> _logger;


        private readonly FilePathSettings _filePaths;

        public AccountRepository(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext, MapDBContext mapDBContext, IOptions<FilePathSettings> filePaths)
        {
            _filePaths = filePaths.Value;
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
            _mapDBContext = mapDBContext;
        }

        public async Task<bool> CheckStatus(ApplicationUser user)
        {
            var status = await _authDbContext.UserAuthViews
                .Where(v => v.UserId == user.Id)
                .Select(v => new { v.UserStatus, v.RoleStatus, v.DeptStatus })
                .FirstOrDefaultAsync();

            return status != null && status.UserStatus
                && (status.RoleStatus ?? false) && (status.DeptStatus ?? false);
        }

        public async Task<Dictionary<string, PermissionDetail>> GetUserPermissions(string roleId)
        {
            // 檢視表已是「角色 × 全部權限」矩陣，未指派的權限 CRUD 皆為 false，
            // 畫面上 Model["權限名稱"] 直接索引時不會因找不到 key 而拋出例外
            var result = await _authDbContext.RolePermissionViews
                .Where(v => v.RoleId == roleId)
                .ToDictionaryAsync(
                    v => v.PermissionName,
                    v => new PermissionDetail
                    {
                        // 未指派時維持原本預設值（Status = false）
                        Status = v.IsAssigned && v.PermissionStatus,
                        Read = v.Read,
                        Create = v.Create,
                        Update = v.Update,
                        Delete = v.Delete,
                        Export = v.Export
                    });

            // 角色不存在（例如使用者未指派角色）時檢視表沒有資料，仍需補上所有權限的預設值
            if (result.Count == 0)
            {
                var allPermissionNames = await _authDbContext.Permissions
                    .Select(p => p.Name)
                    .ToListAsync();

                foreach (var name in allPermissionNames)
                {
                    result[name] = new PermissionDetail();
                }
            }

            return result;
        }

        public async Task<UserAuthInfo> GetUserAuthInfo(ApplicationUser user)
        {
            return await _authDbContext.UserAuthViews
                .Where(v => v.UserId == user.Id)
                .Select(v => new UserAuthInfo
                {
                    departmentId = v.DepartmentId ?? 0,
                    departmentName = v.DepartmentName,
                    deptStatus = v.DeptStatus ?? false,
                    roleId = v.RoleId,
                    roleName = v.RoleName,
                    roleStatus = v.RoleStatus ?? false
                })
                .FirstAsync();
        }
        public async Task<RolePermission> GetUserPermission(string userId, string permissionName)
        {
            var permission = await (
                from v in _authDbContext.UserAuthViews
                join rp in _authDbContext.RolePermissions on v.RoleId equals rp.RoleId
                where v.UserId == userId && rp.Permission.Name == permissionName
                select rp)
                .FirstOrDefaultAsync();

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
                if (role == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"找不到角色 (RoleId: {updateUser.RoleId})");
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
                // Email 由獨立的 UpdateEmail 流程處理，此處不覆寫
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

                var existEmail = await _userManager.FindByEmailAsync(user.Email);
                if (existEmail != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "信箱已被使用");
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
                    EmailConfirmed = false,
                    DepartmentId = user.DepartmentId,
                    Status = user.Status,
                    Order = maxOrder + 1,
                };

                var result = await _userManager.CreateAsync(createUser, user.Password);

                if (result.Succeeded)
                {
                    var role = await _roleManager.FindByIdAsync(user.RoleId);
                    if (role == null)
                    {
                        await transaction.RollbackAsync();
                        _authDbContext.ChangeTracker.Clear();
                        return (false, $"找不到角色 (RoleId: {user.RoleId})");
                    }
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
            var rows = await _authDbContext.RolePermissionViews
                .Where(v => v.RoleId == id)
                .OrderBy(v => v.PermissionOrder)
                .ToListAsync();
            // 尚無任何權限類別時檢視表沒有資料，改由 Roles 取得角色名稱
            var roleName = rows.Count > 0
                ? rows[0].RoleName
                : (await _authDbContext.Roles.FindAsync(id)).Name;
            var updateRole = new ReadRolePermission
            {
                RoleName = roleName,
                Permissions = rows
                    .Where(v => v.IsAssigned)
                    .Select(v => new ReadPermission
                    {
                        PermissionName = v.PermissionName,
                        Create = v.Create,
                        Read = v.Read,
                        Delete = v.Delete,
                        Update = v.Update,
                        Export = v.Export
                    }).ToList()
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
            return await _authDbContext.UserAuthViews
                .OrderBy(v => v.UserOrder)
                .Select(v => new DepartmentUser
                {
                    Id = v.UserId,
                    Name = v.UserName,
                    DepartmentId = v.DepartmentId,
                    Department = v.DepartmentName,
                    Role = v.RoleName,
                    Status = v.UserStatus,
                    CreateAt = v.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<UserManager> GetUserManagerDataAsync()
        {
            var userList = await _authDbContext.UserAuthViews
                .OrderBy(v => v.DeptOrder ?? 0)
                .ThenBy(v => v.RoleOrder ?? 0)
                .ThenBy(v => v.UserOrder)
                .Select(v => new UserData
                {
                    Id = v.UserId,
                    DepartmentId = v.DepartmentId,
                    Department = v.DepartmentName ?? "",
                    UserName = v.UserName,
                    DisplayName = v.DisplayName,
                    Email = v.Email,
                    Phone = v.PhoneNumber,
                    RoleId = v.RoleId,
                    Role = v.RoleName ?? "No Role",
                    CitizenCardNo = v.CitizenCardNo,
                    Order = v.UserOrder,
                    Status = v.UserStatus,
                    EmailConfirm = v.EmailConfirmed,
                    CreateAt = v.CreatedAt
                })
                .ToListAsync();

            // 2. 獲取部門列表
            var departments = await _authDbContext.Departments
                .OrderBy(d => d.Order)
                .Select(d => new UserDepartment { Id = d.Id, Name = d.Name })
                .ToListAsync();

            // 3. 獲取角色列表
            var roles = await _authDbContext.Roles
                .OrderBy(r => r.Order)
                .Select(r => new UserRole { Id = r.Id, Name = r.Name })
                .ToListAsync();

            return new UserManager
            {
                Users = userList,
                Roles = roles,
                Departments = departments
            };
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
                // if(department.IsSystemProtected)
                // {
                //     await transaction.RollbackAsync();
                //     _authDbContext.ChangeTracker.Clear();
                //     return (false, $"無法修改系統保護的部門 {department.Name}");
                // }
                // 修改使用者資料
                department.Name = updateDepartment.Name;
                department.Status = updateDepartment.Status;
                _authDbContext.Departments.Update(department);
                
                int pipelineAdd = 0;
                int pipelineRemove = 0;
                var affectedCategories = new HashSet<int>();
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
                var visited = new HashSet<int>();
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

        private async Task<List<int>> RecalculateCategoryDepartmentsUpward(int categoryId, HashSet<int> visited)
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
            var rows = await _authDbContext.RolePermissionViews
                .Where(v => v.RoleName == roleName)
                .ToListAsync();
            if (rows.Count == 0)
            {
                // 尚無任何權限類別時檢視表沒有資料，改由 Roles 確認角色是否存在
                var role = await _authDbContext.Roles.Where(r => r.Name == roleName).FirstOrDefaultAsync();
                if (role == null)
                {
                    return null;
                }
                return new GetRolePermission { RoleId = role.Id, RoleName = role.Name, Permissions = new List<GetPermission>() };
            }
            var rolePermissions = new GetRolePermission
            {
                RoleId = rows[0].RoleId,
                RoleName = rows[0].RoleName,
                Permissions = rows
                    .Where(v => v.IsAssigned)
                    .Select(v => new GetPermission
                    {
                        PermissionName = v.PermissionName,
                        Read = v.Read,
                        Create = v.Create,
                        Update = v.Update,
                        Delete = v.Delete,
                        Export = v.Export
                    }).ToList()
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
            var rows = await _authDbContext.RolePermissionViews
                .Where(v => v.RoleId == id)
                .OrderBy(v => v.PermissionOrder)
                .ToListAsync();
            // 尚無任何權限類別時檢視表沒有資料，改由 Roles 取得角色資料
            var role = rows.Count > 0 ? null : await _authDbContext.Roles.FindAsync(id);
            var roleData = new UpdateRoleView
            {
                RoleId = id,
                RoleName = rows.Count > 0 ? rows[0].RoleName : role.Name,
                Status = rows.Count > 0 ? rows[0].RoleStatus : role.Status,
                // 只列出已指派的權限：UpdateRoleAsync 只會更新既有的 RolePermissions 資料列
                Permissions = rows
                    .Where(v => v.IsAssigned)
                    .Select(v => new UpdatePermission
                    {
                        PermissionId = v.PermissionId,
                        PermissionName = v.PermissionName,
                        Create = v.Create,
                        Read = v.Read,
                        Delete = v.Delete,
                        Update = v.Update,
                        Export = v.Export
                    }).ToList()
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
            return await _authDbContext.UserAuthViews
                .Where(v => v.UserId == id)
                .Select(v => new UserProfileView
                {
                    Id = v.UserId,
                    UserName = v.UserName,
                    DisplayName = v.DisplayName,
                    Email = v.Email,
                    Phone = v.PhoneNumber,
                    Role = v.RoleName,
                    Department = v.DepartmentName,
                    CitizenCardNo = v.CitizenCardNo
                })
                .FirstAsync();
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
                Password = user.PasswordHash,
                DisplayName = user.DisplayName,
                Email = user.Email,
                Phone = user.PhoneNumber,
                RoleId = _authDbContext.UserRoles
                            .Where(ur => ur.UserId == user.Id)
                            .Select(ur => ur.RoleId)
                            .FirstOrDefault(),
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
                    return (false, $"身分建立失敗：{string.Join("、", result.Errors.Select(e => e.Description))}");
                }
                if (createRole.Permissions == null || createRole.Permissions.Count == 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "身分建立失敗：未收到任何功能權限資料");
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
                var affectedCategories = new HashSet<int>();
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
                var visited = new HashSet<int>();
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

     
        // 這個會將 Category 的 Id 加到順序清單中
        private void BuildCategoryOrder(int id, List<Category> allCategories, List<int> orderList)
        {
            orderList.Add(id); // 儲存順序
            var childCate = allCategories.Where(c => c.ParentId == id).OrderBy(c => c.OrderId).ToList();
            foreach (var c in childCate)
            {
                BuildCategoryOrder(c.Id, allCategories, orderList);
            }
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
                if(existUser.UserName == updateUserPassword.NewPassword)
                {
                    return (false, $"密碼不能跟帳號相同");
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

        public async Task<(bool Success, string Message)> UpdateUserEmailAsync(UpdateUserEmail updateUserEmail)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var existUser = await _userManager.FindByIdAsync(updateUserEmail.UserId);
                if (existUser == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"帳號不存在");
                }
                if (existUser.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的使用者 {existUser.UserName}");
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
        
        public async Task<(bool Success, string Message)> UpdateCitizenCardNoAsync(UpdateCitizenCardNo updateCitizenCardNo)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var serialNumber = updateCitizenCardNo.NewCitizenCardNo;
                if (string.IsNullOrWhiteSpace(serialNumber))
                    return (false, "憑證序號無效");
                // 2. 檢查該序號是否已被其他帳號綁定 (唯一性檢查)
                var isUsed = await _userManager.Users.AnyAsync(u => u.CitizenCardNo == serialNumber && u.Id != updateCitizenCardNo.UserId);
                if (isUsed)
                {
                    return (false, $"此憑證已被其他帳號綁定");
                }
                var existUser = await _userManager.FindByIdAsync(updateCitizenCardNo.UserId);
                if (existUser == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"帳號不存在");
                }
                if (existUser.IsSystemProtected)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"無法修改系統保護的使用者 {existUser.UserName}");
                }

                // 3. 更新序號
                existUser.CitizenCardNo = serialNumber;
                var result = await _userManager.UpdateAsync(existUser);

                if (result.Succeeded)
                {
                    _logger?.LogInformation($"使用者 {existUser.UserName} 重新綁定憑證成功");
                }
                await transaction.CommitAsync();
                return (true, "憑證綁定成功");

            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                return (false, $"憑證綁定失敗: {ex.Message}");
            }
        }
        public async Task<(bool Success, string? Data, string? Message)> GetPipelineAccessAsync(int id)
        {
            var allCategories = await _mapDBContext.Categories.ToListAsync();
            var jsTreeData = BuildJsTreeData(allCategories, null, id);
            var json = JsonConvert.SerializeObject(jsTreeData);
            return (true, json, null); // 成功時回傳 json 資料
        }
        private List<object> BuildJsTreeData(List<Category> allCategories, int? parentId, int deptId)
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

        public async Task<UpdatePipelineView> UpdatePupelineViewAsync(int id)
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
        // 「帳號」類別：登入/登出/延長登入等身分驗證相關操作
        private static readonly string[] LogAccountTypes = { "登入", "Login-POST", "登出", "登入延長", "ExtendSession" };

        // 「管理」類別：使用者/角色/權限/部門的新增修改刪除（不含個人資料自助操作、不含專案管理）
        private static readonly string[] LogManagementTypes = {
            "新增使用者", "更新使用者", "刪除使用者",
            "新增角色", "更新角色", "刪除角色",
            "新增權限", "更新權限", "刪除權限",
            "新增部門", "更新部門", "刪除部門"
        };

        // 「操作」類別：帳號、管理以外的所有業務操作
        private static readonly string[] LogOperationTypes = {
            "RegisterSelect", "註冊", "ConfirmEmail", "ResendConfirmationEmail",
            "ForgotPassword", "ResetPassword-GET", "重設密碼", "重設密碼T",
            "更新個人資料", "更新使用者密碼", "更新使用者信箱", "確認使用者信箱", "更新身分證字號",
            "新增類別", "新增類別(JSON)", "新增地圖來源", "新增道路", "新增道路(CSV)", "新增管線",
            "新增道路專案", "更新道路專案", "刪除道路專案",
            "匯入道路專案(Excel)", "匯入施工通告(Excel)",
            "新增歷程", "更新歷程", "刪除歷程", "匯出歷程補充資料"
        };

        public async Task<List<LogRecord>> GetLogRecordAsync(LogQuery query)
        {
            var logRecords = new List<LogRecord>();
            var _logDirectory = Path.GetDirectoryName(Path.GetFullPath(_filePaths.Log))!;
            try
            {
                if (!Directory.Exists(_logDirectory))
                {
                    return logRecords;
                }

                // 取得目錄下所有 .log 檔案，並依查詢的日期區間先排除掉不可能符合的檔案
                var logFiles = Directory.GetFiles(_logDirectory, "*.log")
                                        .Where(f => IsLogFileInDateRange(f, query?.DateFrom, query?.DateTo))
                                        .OrderByDescending(f => f)
                                        .ToList();

                foreach (var logFile in logFiles)
                {
                    var records = await ParseLogFileAsync(logFile);
                    logRecords.AddRange(records);
                }

                var filtered = logRecords.AsEnumerable();

                if (query?.DateFrom != null)
                    filtered = filtered.Where(r => r.Timestamp >= query.DateFrom.Value.Date);

                if (query?.DateTo != null)
                    filtered = filtered.Where(r => r.Timestamp < query.DateTo.Value.Date.AddDays(1));

                if (!string.IsNullOrWhiteSpace(query?.User))
                    filtered = filtered.Where(r => r.UserId != null && r.UserId.Contains(query.User, StringComparison.OrdinalIgnoreCase));

                if (!string.IsNullOrWhiteSpace(query?.Category))
                {
                    var types = query.Category switch
                    {
                        "account" => LogAccountTypes,
                        "management" => LogManagementTypes,
                        "operation" => LogOperationTypes,
                        _ => null
                    };

                    if (types != null)
                        filtered = filtered.Where(r => types.Contains(r.Type));
                }

                // 依時間排序（最新的在前）
                logRecords = filtered.OrderByDescending(r => r.Timestamp).ToList();
            }
            catch (Exception ex)
            {
            }

            return logRecords;
        }

        // 依檔名（log-yyyyMMdd.log）判斷該檔案是否落在查詢日期區間內，避免開啟不必要的檔案
        private bool IsLogFileInDateRange(string filePath, DateTime? dateFrom, DateTime? dateTo)
        {
            if (dateFrom == null && dateTo == null)
                return true;

            var fileName = Path.GetFileNameWithoutExtension(filePath);
            var match = Regex.Match(fileName, @"(?<date>\d{8})$");
            if (!match.Success || !DateTime.TryParseExact(match.Groups["date"].Value, "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var fileDate))
                return true; // 檔名無法判斷日期時保留，交由內容過濾

            if (dateFrom != null && fileDate < dateFrom.Value.Date)
                return false;

            if (dateTo != null && fileDate > dateTo.Value.Date)
                return false;

            return true;
        }

        private async Task<List<LogRecord>> ParseLogFileAsync(string filePath)
        {
            var records = new List<LogRecord>();

            try
            {
                // 使用 FileShare.ReadWrite 允許同時讀寫
                using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(fileStream);

                string line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    var record = ParseLogLine(line);
                    if (record != null)
                    {
                        records.Add(record);
                    }
                }
            }
            catch (Exception ex)
            {
                //_logger.LogError(ex, $"解析日誌檔案時發生錯誤: {filePath}");
            }

            return records;
        }

        /// <summary>
        /// 解析單行日誌
        /// 格式: 2024-12-19 10:27:13.207 +08:00 [WRN] UserId: wronguser | IP: 192.168.1.100 | Operation: Login-POST | Status: Failed | Reason: 驗證碼錯誤
        /// </summary>
        private LogRecord ParseLogLine(string line)
        {
            if (string.IsNullOrWhiteSpace(line))
                return null;

            try
            {
                // 正則表達式解析日誌行
                var pattern = @"^(?<timestamp>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+[+\-]\d{2}:\d{2})\s+\[(?<level>\w+)\]\s+UserId:\s+(?<userId>[^|]+)\s+\|\s+IP:\s+(?<ip>[^|]+)\s+\|\s+Operation:\s+(?<operation>[^|]+)\s+\|\s+Status:\s+(?<status>\w+)\s+\|\s+Reason:\s+(?<reason>.*)$";

                var match = Regex.Match(line, pattern);

                if (match.Success)
                {
                    return new LogRecord
                    {
                        Timestamp = DateTime.Parse(match.Groups["timestamp"].Value),
                        UserId = match.Groups["userId"].Value.Trim(),
                        IP = match.Groups["ip"].Value.Trim(),
                        Type = match.Groups["operation"].Value.Trim(),
                        Success = match.Groups["status"].Value.Trim().Equals("Success", StringComparison.OrdinalIgnoreCase),
                        Reason = match.Groups["reason"].Value.Trim()
                    };
                }
            }
            catch (Exception ex)
            {
            }

            return null;
        }
    }
}
