using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Mapdatas;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using RMIS.Repositories;
using System.Data;
using System.Security;
using System.Threading.Tasks;

namespace RMIS.Controllers
{
    /// <summary>
    /// 帳號權限管理
    /// </summary>
    /// <returns></returns>
    public class AccountController : Controller
    {
        private readonly AccountInterface _accountInterface;
        private readonly AdminInterface _adminInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;


        public AccountController(AccountInterface accountInterface, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext, AdminInterface adminInterface)
        {
            _accountInterface = accountInterface;
            _adminInterface = adminInterface;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;            
        }

        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
                return Redirect(returnUrl);
            else
                return RedirectToAction("Index", "Home");
        }

        [HttpGet("[controller]/User/List")]
        public async Task<IActionResult> UserManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return RedirectToAction("Login", "Portal");
            }
            ViewBag.Username = currentUser.UserName;
            return View();
        }

        [HttpGet("[controller]/Permission/List")]
        public async Task<IActionResult> PermissionManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            ViewBag.Username = currentUser.UserName;
            return View();
        }

        [HttpGet("[controller]/Role/List")]
        public async Task<IActionResult> RoleManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            ViewBag.Username = currentUser.UserName;
            return View();
        }

        [HttpGet("[controller]/Department/List")]
        public async Task<IActionResult> DepartmentManage()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            ViewBag.Username = currentUser.UserName;
            return View();
        }


        [HttpGet("[controller]/Mapdata/List")]
        public async Task<IActionResult> MapdataManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            ViewBag.Username = currentUser.UserName;
            return View();
        }

        [HttpGet("[controller]/Role/Read/Permission")]
        public async Task<IActionResult> RolePermission(string id)
        {
            var rolePermission = await _accountInterface.GetRolePermissionsAsync(id);
            return View(rolePermission);
        }

        [HttpGet("[controller]/RolePermissions/Get")]
        public async Task<IActionResult> GetRolePermissions(string roleName)
        {
            var role = await _authDbContext.Roles.Where(r => r.Name == roleName).FirstOrDefaultAsync();
            if (role == null)
            {
                return NotFound();
            }

            var rolePermissions = await _accountInterface.GetRolePermissionAsync(roleName);

            return Json(rolePermissions);
        }
        [HttpGet("[controller]/User/Profile")]
        public async Task<IActionResult> UserProfile()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if(currentUser == null)
            {
                return NotFound();
            }
            var userProfile = await _accountInterface.GetUserProfileDataAsync(currentUser.Id);
            return View(userProfile);
        }

        [HttpPost("[controller]/User/Get/ManagerData")]
        public async Task<IActionResult> GetUserManagerData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var UserManagerData = await _accountInterface.GetUserManagerDataAsync();
            return Ok(new { Success = true, UserManager = UserManagerData });
        }

        [HttpPost("[controller]/User/GetUsers")]
        public async Task<IActionResult> GetUsers()
        {
            var departmentUsers = await _accountInterface.GetAllUser();
            return Ok(new { success = true, users = departmentUsers });
        }

        [HttpGet("[controller]/User/Update")]
        public async Task<IActionResult> UpdateUser(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }
            var user = await _accountInterface.UpdateUserViewAsync(id);
            return View(user);
        }

        [HttpPost("[controller]/User/Update")]
        public async Task<IActionResult> UpdateUser([FromForm] UpdateUserView updateUser)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }
            Console.WriteLine("UserUpdate");
            var updated = await _accountInterface.UpdateUserAsync(updateUser);

            if (updated.Success)
            {
                return Json(new { success = updated.Success, message = updated.Message });
            }
            else
            {
                return Json(new { success = updated.Success, message = updated.Message });
            }

        }

        [HttpPost("[controller]/User/UpdatePassword")]
        public async Task<IActionResult> UpdateUserPassword([FromForm] UpdateUserPassword updateUserPassword)
        {

            var updated = await _accountInterface.UpdateUserPasswordAsync(updateUserPassword);
            return Json(new { success = updated.Success, message = updated.Message });
        }

        [HttpPost("[controller]/User/Delete")]
        public async Task<IActionResult> DeleteUser(string UserId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser.Id == UserId)
            {
                return Json(new { success = false, message = "無法刪除自己" });
            }

            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Delete)
            {
                return Json(new { success = false, message = "無權限刪除使用者" });
            }
            Console.WriteLine("DeleteUser");
            var result = await _accountInterface.DeleteUserAsync(UserId);

            return Json(new { success = result.Success, message = result.Message });
        }

        [HttpGet("[controller]/User/Create")]
        public async Task<IActionResult> CreateUser()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");
            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var createUser = new CreateUserView();
            createUser.Departments = await _authDbContext.Departments
                .Select(d => new SelectListItem
                {
                    Value = d.Id.ToString(),
                    Text = d.Name
                }).ToListAsync();
            createUser.Roles = await _authDbContext.Roles
                .OrderBy(r => r.Order)
                .Select(r => new SelectListItem
                {
                    Value = r.Id,
                    Text = r.Name
                }).ToListAsync();
            return View(createUser);
        }
        [HttpPost("[controller]/User/Create")]
        public async Task<IActionResult> CreateUser([FromForm] CreateUser createUser)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");
            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
                
            var created = await _accountInterface.CreateUserAsync(createUser);
            return Json(new { success = created.Success, message = created.Message });
        }
        [HttpPost("[controller]/Role/Get/ManagerData")]
        public async Task<IActionResult> GetRoleManagerData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var RoleManagerData = await _accountInterface.GetRoleManagerDataAsync();
            return Ok(new { success = true, RoleManager = RoleManagerData });
        }

        [HttpGet("[controller]/Role/Update")]
        public async Task<IActionResult> UpdateRole(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var role = await _accountInterface.UpdateRoleViewAsync(id);
            return View(role);
        }

        [HttpPost("[controller]/Role/Update")]
        public async Task<IActionResult> UpdateRole([FromForm] UpdateRoleView input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }
            // role : (bool Success, string Message)
            if(input.RoleId == null)
            {
                return Json(new { success = false, message = "修改失敗" });
            }
            var updated = await _accountInterface.UpdateRoleAsync(input);
            return Json(new { success = updated.Success, message = updated.Message });
        }

        [HttpPost("[controller]/Role/Delete")]
        public async Task<IActionResult> DeleteRole(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Delete)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var deleted = await _accountInterface.DeleteRoleAsync(id);

            return Json(new { success = deleted.Success, message = deleted.Message });
        }

        [HttpGet("[controller]/Role/Create")]
        public async Task<IActionResult> CreateRole()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var CreateRole = new CreateRoleView();
            CreateRole.Permissions = _authDbContext.Permissions
                .OrderBy(p => p.Order)
                .Select(p => new CreatePermission
                {
                    PermissionId = p.Id,
                    PermissionName = p.Name,
                    Read = false,
                    Create = false,
                    Update = false,
                    Delete = false,
                    Export = false
                }).ToList();
            return View(CreateRole);
        }

        [HttpPost("[controller]/Role/Create")]
        public async Task<IActionResult> CreateRole([FromForm] CreateRoleView createRole)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var created = await _accountInterface.CreateRoleAsync(createRole);

            return Json(new { success = created.Success, message = created.Message });
        }
        
        [HttpPost("[controller]/Permission/Get/ManagerData")]
        public async Task<IActionResult> GetPermissionManagerData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var PermissionManagerData = await _accountInterface.GetPermissionManagerDataAsync();
            return Ok(new { success = true, PermissionManager = PermissionManagerData });
        }

        [HttpGet("[controller]/Permission/Update")]
        public async Task<IActionResult> UpdatePermission(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var permission = await _accountInterface.UpdatePermissionViewAsync(id);
            return View(permission);
        }
        [HttpPost("[controller]/Permission/Update")]
        public async Task<IActionResult> UpdatePermission([FromForm] UpdatePermissionView updatePermission)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var updated = await _accountInterface.UpdatePermissionAsync(updatePermission);
            return Json(new { success = updated.Success, message = updated.Message });
        }

        [HttpGet("[controller]/Permission/Create")]
        public async Task<IActionResult> CreatePermission()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            return View();
        }

        [HttpPost("[controller]/Permission/Create")]
        public async Task<IActionResult> CreatePermission(CreatePermissionView createPermission)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var Created = await _accountInterface.CreatePermissionAsync(createPermission);

            return Json( new { success = Created.Success, message = Created.Message });
        }

        [HttpPost("[controller]/Permission/Delete")]
        public async Task<IActionResult> DeletePermission(int permissionId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var deleted = await _accountInterface.DeletePermissionAsync(permissionId);
            return Ok(new {success = deleted.Success, message = deleted.Message});
        }

        [HttpPost("[controller]/Department/Get/ManagerData")]
        public async Task<IActionResult> GetDepartmentManagerData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var DepartmentManagerData = await _accountInterface.GetDepartmentManagerDataAsync();
            return Ok(new { Success = true, DepartmentManager = DepartmentManagerData });
        }

        [HttpPost("[controller]/Department/Get/PipelineAccess")]
        public async Task<IActionResult> GetPipelineAccess(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var PipelineAccess = await _accountInterface.GetPipelineAccessAsync(id);
            return Json(new { Success = PipelineAccess.Success, Data = PipelineAccess.Data, Message = PipelineAccess.Message });
        }
        [HttpGet("[controller]/Department/Update")]
        public async Task<IActionResult> UpdateDepartment(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            var department = await _accountInterface.UpdateDepartmentViewAsync(id);
            return View(department);
        }
        [HttpPost("[controller]/Department/Update")]
        public async Task<IActionResult> UpdateDepartment([FromForm] UpdateDepartmentView updateDepartment)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }

            Console.WriteLine("DepartmentUpdate");
            var updated = await _accountInterface.UpdateDepartmentAsync(updateDepartment);
            if (updated.Success)
            {
                return Ok(new { success = true, message = updated.Message });
            }
            else
            {
                return Ok(new { success = false, message = updated.Message });
            }
        }
        [HttpPost("[controller]/Department/Delete")]
        public async Task<IActionResult> DepartmentDelete(int departmentId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Delete)
            {
                return Json(new { success = false, message = "無權限刪除" });
            }

            var result = await _accountInterface.DeleteDepartmentAsync(departmentId);

            return Ok(new { success = result.Success, message = result.Message });
        }

        [HttpGet("[controller]/Department/Create")]
        public async Task<IActionResult> CreateDepartment()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限刪除" });
            }
            return View();
        }
        [HttpPost("[controller]/Department/Create")]
        public async Task<IActionResult> CreateDepartment(CreateDepartmentView createDepartment)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限刪除" });
            }

            var result = await _accountInterface.CreateDepartmentAsync(createDepartment);

            return Json(new {success = result.Success, message = result.Message });
        }

        [HttpPost("[controller]/Mapdata/Get/ManagerData")]
        public async Task<IActionResult> GetMapdataManagerData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var MapdataManagerData = await _accountInterface.GetMapdataManagerDataAsync();
            return Ok(new { success = true, MapdataManager = MapdataManagerData });
        }

        [HttpGet("[controller]/Mapdata/Read/Layer")]
        public IActionResult MapdataLayer(Guid id)
        {
            return View();
        }

        [HttpGet("[controller]/Mapdata/Read/Point")]
        public IActionResult MapdataPoint(Guid areaId, string kind)
        {
            return View();
        }

        [HttpGet("[controller]/Mapdata/Get/Point")]
        public async Task<IActionResult> GetMapdataPoint(Guid areaId)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var MapdataPoints = await _accountInterface.GetMapdataPointsAsync(areaId);
            if (MapdataPoints == null)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, points = MapdataPoints, message = "取得圖資" });
        }

        [HttpPost("[controller]/Mapdata/Delete")]
        public async Task<IActionResult> DeleteMapdata(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Delete)
            {
                return Json(new { success = false, message = "無權限刪除" });
            }
            var delete = await _adminInterface.DeletePipelineAsync(id);
            if (delete == 0)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, message = "刪除圖資" });
        }

        [HttpPost("[controller]/Mapdata/Get/Layer")]
        public async Task<IActionResult> GetMapdataLayer(Guid id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }
            var MapdataLayers = await _accountInterface.GetMapdataLayersAsync(id);
            if (MapdataLayers == null)
            {
                return Json(new { success = false, message = "無圖資" });
            }
            return Json(new { success = true, layers = MapdataLayers, message = "取得圖資" });
        }
        // 無權限時
        public IActionResult AccessDenied(string returnUrl = null)
        {
            return RedirectToAction("Login", "Portal", new { returnUrl });
        }
    }

}
