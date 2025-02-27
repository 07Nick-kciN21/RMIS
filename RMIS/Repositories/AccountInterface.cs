using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;

namespace RMIS.Repositories
{
    public interface AccountInterface
    {
        Task<RolePermission> GetUserPermission(string userName, string permissionName);
        Task<GetRolePermission> GetRolePermissionAsync(string roleName);
        Task<bool> CreatePermissionAsync(NewPermission newPermission);
        Task<bool> DeletePermissionAsync(int PermissionId);
        Task<bool> DeleteRoleAsync(string RoleId);
        Task<bool> DeleteUserAsync(string UserId);
        Task<(bool Success, string Message)> CreateUserAsync(CreateUser createUser);
        Task<bool> UpdateUserAsync(UpdateUser updateUser);
        Task<UpdateRoleView> UpdateRoleViewAsync(string id);
        Task<(bool Success, string Message)> UpdateRoleAsync(UpdateRoleView input);
        Task<List<DepartmentUser>> GetAllUser();
        Task<UserManager> GetUserManagerDataAsync();
        Task<DepartmentManager> GetDepartmentManagerDataAsync();
        Task<bool> UpdateDepartmentAsync(UpdateDepartment updateDepartment);
        Task<(bool Success, string Message)> DeleteDepartmentAsync(int departmentId);
        Task<RoleManager> GetRoleManagerDataAsync();
        Task<ReadRolePermission> GetRolePermissionsAsync(string id);
    }
}
