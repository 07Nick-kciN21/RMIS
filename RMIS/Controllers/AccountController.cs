using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account;
using RMIS.Models.Auth;
using RMIS.Repositories;
using System.Data;
using System.Security;

namespace RMIS.Controllers
{
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

        [HttpGet("[controller]/Register")]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost("[controller]/Register")]
        public async Task<IActionResult> Register(RegisterUser user)
        {
            if (!ModelState.IsValid)
                return View(user);

            var createUser = new CreateUser
            {
                Name = user.Username,
                Password = user.Password,
                Email = user.Email,
                Phone = user.Phone
            };
            var result = await _accountInterface.CreateUserAsync(createUser);

            if (result.Success)
            {
                return RedirectToAction("Login", "Portal"); // ✅ 註冊成功跳轉首頁
            }
            else
            {
                // ✅ 透過 ViewData 讓錯誤訊息顯示在 `Register` View
                ViewData["ErrorMessage"] = result.Message;
                return View(user);
            }
        }

        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
                return Redirect(returnUrl);
            else
                return RedirectToAction("Index", "Home");
        }

        // 身分更新
        [Authorize(Roles = "Admin")]
        [HttpGet("[controller]/RolePermission/Update")]
        public async Task<IActionResult> UpdateRolePermission()
        {
            var updateRole = await _accountInterface.GetUpdateRolePermissionsAsync();

            return View(updateRole);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("[controller]/RolePermission/Update")]
        public async Task<IActionResult> UpdateRolePermission([FromForm] UpdateRolePermission updateRoles)
        {
            if(updateRoles == null)
            {
                Console.WriteLine("updateRoles is null");
            }
            await _accountInterface.UpdateRolePermissionsAsync(updateRoles);

            return Ok();
        }

        [HttpGet("[controller]/RolePermissions/Get")]
        public async Task<IActionResult> GetRolePermissions(string roleName)
        {
            var role = await _authDbContext.Roles.Where(r => r.Name == roleName).FirstOrDefaultAsync();
            if (role == null)
            {
                return NotFound();
            }

            var rolePermissions = await _authDbContext.RolePermissions
                .Where(rp => rp.RoleId == role.Id)
                .Select(rp => new GetRolePermission
                {
                    PermissionName = rp.Permission.Name,
                    Read = rp.Read,
                    Create = rp.Create,
                    Update = rp.Update,
                    Delete = rp.Delete,
                    Export = rp.Export
                })
                .ToListAsync();

            return Json(new { RoleId = role.Id, RoleName = role.Name, Permissions = rolePermissions });
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

        [HttpGet("[controller]/User/List")]
        public async Task<IActionResult> UserManager()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "使用者管理");
            
            if (!currentUserPermission.Read)
            {
                return Json(new { success = false, message = "無權限查看" });
            }

            var users = await _authDbContext.Users
                .OrderBy(u => u.Order)
                .Select(u => new User
                {
                    Id = u.Id,
                    DepartmentId = u.DepartmentId,
                    Department = u.Department.Name,
                    Name = u.UserName,
                    Role = _userManager.GetRolesAsync(u).Result.First(),
                    Status = u.Status,
                    CreateAt = u.CreatedAt
                }
                ).ToListAsync();

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
            var userManagerView = new UserManagerView
            {
                Users = users,
                Roles = roles,
                Departments = departments
            };
            return View(userManagerView);
        }

        [HttpPost("[controller]/User/Update")]
        public async Task<IActionResult> UserUpdate([FromForm] UpdateUser updateUser)
        {
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

        [HttpPost("[controller]/User/GetUsersByDepartment")]
        public async Task<IActionResult> GetUsersByDepartment([FromForm] int departmentId)
        {
            var departmentUsers = await _accountInterface.GetDepartmentUser(departmentId);
            return Ok(new {success = true, users = departmentUsers});
        }

        [HttpPost("[controller]/User/GetUsers")]
        public async Task<IActionResult> GetUsers()
        {
            var departmentUsers = await _accountInterface.GetAllUser();
            return Ok(new { success = true, users = departmentUsers });
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

        // 無權限時
        public IActionResult AccessDenied(string returnUrl = null)
        {
            return RedirectToAction("Login", "Portal", new { returnUrl });
        }
    }

}
