using RMIS.Models.Account;
using RMIS.Models.Auth;

namespace RMIS.Repositories
{
    public interface AccountInterface
    {
        Task<RolePermission> GetUserPermission(string userName, string permissionName);
        Task<bool> CreatePermissionAsync(NewPermission newPermission);
        Task<bool> DeletePermissionAsync(int PermissionId);
        Task<bool> DeleteRoleAsync(string RoleId);
        Task<bool> DeleteUserAsync(string UserId);
        Task<(bool Success, string Message)> CreateUserAsync(CreateUser createUser);
        Task<bool> UpdateUserAsync(UpdateUser updateUser);
        Task<UpdateRolePermission> GetUpdateRolePermissionsAsync();
        Task<bool> UpdateRolePermissionsAsync(UpdateRolePermission updateRoles);
        Task<List<DepartmentUser>> GetAllUser();
        Task<UserManager> GetUserManagerDataAsync();
        Task<DepartmentManager> GetDepartmentManagerDataAsync();
        Task<bool> UpdateDepartmentAsync(UpdateDepartment updateDepartment);
        Task<(bool Success, string Message)> DeleteDepartmentAsync(int departmentId);
    }
}
