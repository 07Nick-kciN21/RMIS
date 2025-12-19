using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account.Departments;
using RMIS.Models.Account.Permissions;
using RMIS.Models.Account.Roles;
using RMIS.Models.Account.Users;
using RMIS.Models.Auth;
using RMIS.Repositories;
using System.Data;
using static Org.BouncyCastle.Crypto.Engines.SM2Engine;

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
        private readonly IEmailSender _emailSender;

        public AccountController(AccountInterface accountInterface, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext, AdminInterface adminInterface, IEmailSender emailSender)
        {
            _accountInterface = accountInterface;
            _adminInterface = adminInterface;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
            _emailSender = emailSender;
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

        [HttpGet("[controller]/User/Test")]
        public async Task<IActionResult> UserManagerTest()
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
        public async Task<IActionResult> UpdateUserPassword([FromForm] UpdateUserPassword updateUserPassword, string NewPasswordCaptcha)
        {
            var code = HttpContext.Session.GetString("CaptchaCode_adminUpdate_newPassword");
            if (string.IsNullOrEmpty(code) || !string.Equals(code, NewPasswordCaptcha, StringComparison.OrdinalIgnoreCase))
                return Json(new { success = false, message = "驗證碼錯誤" });

            var updated = await _accountInterface.UpdateUserPasswordAsync(updateUserPassword);
            return Json(new { success = updated.Success, message = updated.Message });
        }

        [HttpPost("[controller]/User/UpdateEmail")]
        public async Task<IActionResult> UpdateUserEmail([FromForm] UpdateUserEmail updateUserEmail, string newEmailCaptcha)
        {
            var code = HttpContext.Session.GetString("CaptchaCode_newEmail");
            if (string.IsNullOrEmpty(code) || !string.Equals(code, newEmailCaptcha, StringComparison.OrdinalIgnoreCase))
                return Json(new { success = false, message = "驗證碼錯誤" });
            var user = await _userManager.FindByIdAsync(updateUserEmail.UserId);
            if (user == null) 
                return Json(new { success = false, message = "使用者不存在" });

            var existEmailUser = await _userManager.FindByEmailAsync(updateUserEmail.NewEmail);
            if (existEmailUser != null)
            {
                return Json(new { success = false, message = "信箱已被註冊" });
            }
            // ✅ 更新 Security Stamp - 這會讓所有舊的 token 失效
            await _userManager.UpdateSecurityStampAsync(user);

            var token = await _userManager.GenerateChangeEmailTokenAsync(user, updateUserEmail.NewEmail);
            var confirmLink = Url.Action("UpdateEmailConfirm", "Account",
                new { userId = user.Id, newEmail = updateUserEmail.NewEmail, token = token },
                protocol: Request.Scheme);

            await _emailSender.SendEmailAsync(updateUserEmail.NewEmail, "請驗證您的新電子郵件",
                    $"請點擊以下連結完成信箱更改驗證：<a href='{confirmLink}'>驗證信箱</a>");

            ViewBag.ResendMessage = "已重新寄送驗證信至您的信箱，請查看信件。";
            return Json(new { success = true, message = "已寄送驗證信至新信箱，請查看信件。" });
        }

        [HttpGet("[controller]/User/UpdateEmailConfirm")]
        public async Task<IActionResult> UpdateEmailConfirm(string userId, string newEmail, string token)
        {
            if (userId == null || newEmail == null || token == null)
                return RedirectToAction("Index", "Home");

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound($"無法載入使用者 ID '{userId}'。");

            var result = await _userManager.ChangeEmailAsync(user, newEmail, token);
            if (result.Succeeded)
            {
                return View();
            }
            else
            {
                ViewBag.ErrorMessage = "驗證失敗，請聯絡管理員。";
                return View("UpdateEmailConfirmExpired");
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

            if (created.Success)
            {
                var userEntity = await _userManager.FindByNameAsync(createUser.Account);
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(userEntity);
                var confirmLink = Url.Action("ConfirmEmail", "Portal",
                    new { userId = userEntity.Id, token = token },
                    protocol: Request.Scheme);

                await _emailSender.SendEmailAsync(createUser.Email, "請驗證您的電子郵件",
                    $"請點擊以下連結完成信箱驗證：<a href='{confirmLink}'>驗證信箱</a>");

                return Json(new { Success = true, Message = "建立帳號，請完成信箱認證" });
            }
            else
            {
                // ✅ 透過 ViewData 讓錯誤訊息顯示在 `Register` View
                // ViewData["ErrorMessage"] = result.Message;
                return Json(new { Success = false, Message = created.Message }); ;
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
        public async Task<IActionResult> UpdateRole([FromForm] UpdateRoleView updaterole)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");

            if (!currentUserPermission.Update)
            {
                return Json(new { success = false, message = "無權限修改" });
            }
            // role : (bool Success, string Message)
            if(updaterole.RoleId == null)
            {
                return Json(new { success = false, message = "修改失敗" });
            }
            var updated = await _accountInterface.UpdateRoleAsync(updaterole);
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

        [HttpGet("[controller]/Log/List")]
        public async Task<IActionResult> LogManage()
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

        [HttpPost("[controller]/Log/Get/ManagerData")]
        public async Task<IActionResult> LogManagerData()
        {
            var result = await _accountInterface.GetLogRecordAsync();
            return Json( new { Success = true, LogManage = result });
        }
        // 無權限時
        public IActionResult AccessDenied(string returnUrl = null)
        {
            return RedirectToAction("Login", "Portal", new { returnUrl });
        }
    }

}
