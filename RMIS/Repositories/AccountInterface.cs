﻿using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;

namespace RMIS.Repositories
{
    public interface AccountInterface
    {
        Task<List<DepartmentUser>> GetAllUser();
        Task<UserManager> GetUserManagerDataAsync();
        Task<RoleManager> GetRoleManagerDataAsync();
        Task<DepartmentManager> GetDepartmentManagerDataAsync();
        Task<PermissionManager> GetPermissionManagerDataAsync();
        Task<ReadRolePermission> GetRolePermissionsAsync(string id);
        Task<RolePermission> GetUserPermission(string userName, string permissionName);
        Task<GetRolePermission> GetRolePermissionAsync(string roleName);
        Task<bool> CreatePermissionAsync(NewPermission newPermission);
        Task<(bool Success, string Message)> CreateRoleAsync(CreateRoleView createRole);
        Task<bool> DeleteUserAsync(string UserId);
        Task<(bool Success, string Message)> DeletePermissionAsync(int PermissionId);
        Task<(bool Success, string Message)> DeleteRoleAsync(string RoleId);        
        Task<(bool Success, string Message)> DeleteDepartmentAsync(int departmentId);
        Task<(bool Success, string Message)> CreateUserAsync(RegisterUser createUser);
        Task<UpdateUserView> UpdateUserViewAsync(string id);
        Task<(bool Success, string Message)> UpdateUserAsync(UpdateUserView updateUser);
        Task<UpdateRoleView> UpdateRoleViewAsync(string id);
        Task<(bool Success, string Message)> UpdateRoleAsync(UpdateRoleView input);
        Task<UpdateDepartmentView> UpdateDepartmentViewAsync(int id);
        Task<(bool Success, string Message)> UpdateDepartmentAsync(UpdateDepartmentView updateDepartment);
        Task<UpdatePermissionView> UpdatePermissionViewAsync(int id);
        Task<(bool Success, string Message)> UpdatePermissionAsync(UpdatePermissionView updatePermission);
    }
}
