using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Mapdatas;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using static RMIS.Controllers.HomeController;

namespace RMIS.Repositories
{
    public interface AccountInterface
    {
        Task<bool> CheckStatus(ApplicationUser user);
        Task<List<DepartmentUser>> GetAllUser();
        Task<Dictionary<string, PermissionDetail>> GetUserPermissions(string roleId);
        Task<string> GetUserDemartment(ApplicationUser user);
        Task<UserAuthInfo> GetUserAuthInfo(ApplicationUser user);
        Task<UserProfileView> GetUserProfileDataAsync(string id);
        Task<UserManager> GetUserManagerDataAsync();
        Task<RoleManager> GetRoleManagerDataAsync();
        Task<DepartmentManager> GetDepartmentManagerDataAsync();
        Task<PermissionManager> GetPermissionManagerDataAsync();
        Task<MapdataManager> GetMapdataManagerDataAsync();
        Task<List<MapdataLayer>> GetMapdataLayersAsync(Guid id);
        Task<List<MapdatAdminDist>> GetMapdataDistsAsync(Guid id);
        Task<List<MapdataArea>> GetMapdataAreasAsync(Guid LayerId, Guid DistId);
        Task<MapdataSearch> GetMapdataSearchAsync(Guid LayerId, Guid DistId, Guid AreaId);
        Task<List<MapdataPoint>> GetMapdataPointsAsync(Guid id);
        Task<ReadRolePermission> GetRolePermissionsAsync(string id);
        Task<RolePermission> GetUserPermission(string userName, string permissionName);
        Task<GetRolePermission> GetRolePermissionAsync(string roleName);
        Task<(bool Success, string Message)> CreatePermissionAsync(CreatePermissionView createPermission);
        Task<(bool Success, string Message)> CreateRoleAsync(CreateRoleView createRole);
        Task<(bool Success, string Message)> DeleteUserAsync(string UserId);
        Task<(bool Success, string Message)> DeletePermissionAsync(int PermissionId);
        Task<(bool Success, string Message)> DeleteRoleAsync(string RoleId);        
        Task<(bool Success, string Message)> DeleteDepartmentAsync(int departmentId);
        Task<(bool Success, string Message)> CreateUserAsync(CreateUser createUser);
        Task<UpdateUserView> UpdateUserViewAsync(string id);
        Task<(bool Success, string Message)> UpdateUserAsync(UpdateUserView updateUser);
        Task<(bool Success, string Message)> UpdateUserPasswordAsync(UpdateUserPassword updateUserPassword);
        Task<UpdateRoleView> UpdateRoleViewAsync(string id);
        Task<(bool Success, string Message)> UpdateRoleAsync(UpdateRoleView updaterole);
        Task<UpdateDepartmentView> UpdateDepartmentViewAsync(int id);
        Task<(bool Success, string Message)> UpdateDepartmentAsync(UpdateDepartmentView updateDepartment);
        Task<(bool Success, string Message)> CreateDepartmentAsync(CreateDepartmentView createDepartment);
        Task<UpdatePermissionView> UpdatePermissionViewAsync(int id);
        Task<(bool Success, string? Data, string? Message)> GetPipelineAccessAsync(int id);
        Task<(bool Success, string Message)> UpdatePermissionAsync(UpdatePermissionView updatePermission);
        Task<UpdatePipelineView> UpdatePupelineViewAsync(Guid id);
        Task<(bool Success, string Message)> UpdatePupelineAsync(UpdatePipeline updatePipeline);
        Task<(bool Success, string? Data, string Message)> GetDatainfoAsync(Guid id);
        Task<(bool Success, string? Message)> ImportMapdataAsync(ImportMapdataView importMapata);
        Task<(bool Success, string Message)> UpdateDatainfoAsync(UpdateDatainfo datainfo);
        Task<(bool Success, string Message)> DeleteMapdataAreaAsync(Guid id);
    }
}
