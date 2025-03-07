using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
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

        public async Task<bool> DeleteUserAsync(string UserId)
        {
            // 檢查被刪除的使用者是否存在
            var user = await _userManager.FindByIdAsync(UserId);

            if (user == null)
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

        public async Task<(bool Success, string Message)> CreateUserAsync(CreateUserView user)
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
                // 修改使用者資料
                department.Name = updateDepartment.Name;
                department.Status = updateDepartment.Status;
                _authDbContext.Departments.Update(department);
                var update = await _authDbContext.SaveChangesAsync();
                if (update == 0)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, "部門修改失敗");
                }
                await transaction.CommitAsync();
                return (true, "部門修改成功");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _authDbContext.ChangeTracker.Clear();
                Console.WriteLine(ex);
                return (false, "部門修改失敗");
            }
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

        public async Task<(bool Success, string Message)> UpdateRoleAsync(UpdateRoleView input)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var role = await _authDbContext.Roles.FindAsync(input.RoleId);
                if(role == null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"身分不存在");
                }
                var rolePermission = await _authDbContext.RolePermissions.Where(p => p.RoleId == input.RoleId).ToListAsync();
                role.Status = input.Status;
                role.Name = input.RoleName;
                role.NormalizedName = input.RoleName.ToUpperInvariant();
                foreach (var permission in input.Permissions)
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
                    Status = p.Status
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

        public async Task<(bool Success, string Message)> RegisterAsync(RegisterUser user)
        {
            using var transaction = await _authDbContext.Database.BeginTransactionAsync();
            try
            {
                var existUser = await _userManager.FindByNameAsync(user.Account);

                if(existUser != null)
                {
                    await transaction.RollbackAsync();
                    _authDbContext.ChangeTracker.Clear();
                    return (false, $"帳號已存在");
                }

                // 取得最大排序值
                int maxOrder = await _authDbContext.Users.MaxAsync(u => (int?)u.Order) ?? 0;
                // 取得"待確認部門"的Id
                int departmentId = await _authDbContext.Departments
                    .Where(d => d.Name == "待確認")
                    .Select(d => d.Id)
                    .FirstOrDefaultAsync();
                var createUser = new ApplicationUser
                {
                    DisplayName = user.DisplayName,
                    UserName = user.Account,
                    PhoneNumber = user.Phone,
                    Email = user.Email,
                    EmailConfirmed = true, // ✅ 預設 Email 已確認
                    DepartmentId = departmentId,
                    Order = maxOrder + 1,
                };

                var result = await _userManager.CreateAsync(createUser, user.Password);

                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(createUser, "使用者");
                    await _authDbContext.SaveChangesAsync();
                    await _signInManager.SignInAsync(createUser, isPersistent: false);
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
    }
}
