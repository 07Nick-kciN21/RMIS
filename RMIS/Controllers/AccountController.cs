using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using RMIS.Repositories;
using System.Data;
using System.Security;

namespace RMIS.Controllers
{
    /// <summary>
    /// 帳號權限管理
    /// </summary>
    /// <returns></returns>
    public class AccountController : Controller
    {
        private readonly AccountInterface _accountInterface;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;

        public AccountController(AccountInterface accountInterface, SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext)
        {
            _accountInterface = accountInterface;
            _signInManager = signInManager;
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

        [HttpGet("[controller]/Permission/List")]
        public async Task<IActionResult> PermissionManager()
        {
            var permissions = await _authDbContext.Permissions.ToListAsync();
            var permissionManager = new PermissionManagerView
            {
                Permissions = permissions
            };

            return View(permissionManager);
        }

        [HttpGet("[controller]/Role/List")]
        public async Task<IActionResult> RoleManager()
        {
            return View();
        }

        [HttpGet("[controller]/User/List")]
        public async Task<IActionResult> UserManager()
        {
            return View();
        }

        [HttpGet("[controller]/Department/List")]
        public IActionResult DepartmentManage()
        {
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


        [HttpGet("[controller]/RolePermission/Create")]
        public async Task<IActionResult> CreateRolePermission()
        {
            var permissions = await _authDbContext.Permissions
                .Select(p => new CreatePermission
                {
                    PermissionId = p.Id,
                    PermissionName = p.Name,
                    Read = false,
                    Create = false,
                    Update = false,
                    Delete = false,
                    Export = false
                })
                .ToListAsync();

                var model = new CreateRole
                {
                    Permissions = permissions
                };

            return View(model);
        }

        [HttpPost("[controller]/RolePermission/Create")]
        public async Task<IActionResult> CreateRolePermission(CreateRole model)
        {

            if (string.IsNullOrWhiteSpace(model.RoleName))
            {
                ModelState.AddModelError("RoleName", "角色名稱不能為空");
                Console.WriteLine("角色名稱不能為空");
                return View(model);
            }

            // 檢查角色是否已存在
            if (await _roleManager.RoleExistsAsync(model.RoleName))
            {
                ModelState.AddModelError("RoleName", "角色已存在");
                Console.WriteLine("角色已存在");
                return View(model);
            }

            // 建立新角色
            var role = new ApplicationRole { Name = model.RoleName };
            var result = await _roleManager.CreateAsync(role);

            if (!result.Succeeded)
            {
                ModelState.AddModelError("", "角色建立失敗");
                return View(model);
            }

            // 取得剛剛建立的角色 ID
            var roleId = role.Id;

            // 新增權限
            var rolePermissions = model.Permissions.Select(p => new RolePermission
            {
                RoleId = roleId,
                PermissionId = p.PermissionId,
                Read = p.Read,
                Create = p.Create,
                Update = p.Update,
                Delete = p.Delete,
                Export = p.Export
            }).ToList();

            _authDbContext.RolePermissions.AddRange(rolePermissions);
            await _authDbContext.SaveChangesAsync();

            return RedirectToAction("Account", "UpdateRolePermission");
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

        [HttpPost("[controller]/User/Update")]
        public async Task<IActionResult> UserUpdate([FromForm] UpdateUser updateUser)
        {
            Console.WriteLine("UserUpdate");
            var updated = await _accountInterface.UpdateUserAsync(updateUser);
            if (updated)
            {
                return Ok(new {success = true});
            }
            else
            {
                return Ok(new { success = false });
            }
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

            if (result)
            {
                Console.WriteLine($"刪除{UserId}成功");
                return Json(new { success = true });
            }
            else
            {
                return Json(new { success = false, message = "刪除使用者失敗" });
            }
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
        public async Task<IActionResult> UpdateRole(UpdateRoleView input)
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
            var role = await _accountInterface.UpdateRoleAsync(input);
            return Json(new { success = role.Success, message = role.Message });
        }
        [HttpPost("[controller]/User/GetUsers")]
        public async Task<IActionResult> GetUsers()
        {
            var departmentUsers = await _accountInterface.GetAllUser();
            return Ok(new { success = true, users = departmentUsers });
        }

        [HttpPost("[controller]/Permission/Create")]
        public async Task<IActionResult> CreatePermission(NewPermission newPermission)
        {
            if (string.IsNullOrWhiteSpace(newPermission.Name))
            {
                ModelState.AddModelError("NewPermissionName", "權限名稱不能為空");
                return View(newPermission);
            }

            var Created = await _accountInterface.CreatePermissionAsync(newPermission);


            return RedirectToAction("PermissionManager");
        }

        [HttpPost("[controller]/Permission/Delete")]
        public async Task<IActionResult> DeletePermission([FromForm] int permissionId)
        {
            var Deleted = await _accountInterface.DeletePermissionAsync(permissionId);
            return Ok(new {success = true});
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
        [HttpPost("[controller]/Department/Update")]
        public async Task<IActionResult> DepartmentUpdate([FromForm] UpdateDepartment updateDepartment)
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
            if (updated)
            {
                return Ok(new { success = true });
            }
            else
            {
                return Ok(new { success = false });
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

            return Ok(new { result.Success, result.Message });
        }

        // 無權限時
        public IActionResult AccessDenied(string returnUrl = null)
        {
            return RedirectToAction("Login", "Portal", new { returnUrl });
        }
    }

}
