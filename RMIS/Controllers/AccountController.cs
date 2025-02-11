using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account;
using RMIS.Models.Auth;
using System.Data;
using System.Security;

namespace RMIS.Controllers
{

    public class AccountController : Controller
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly AuthDbContext _authDbContext;

        public AccountController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, AuthDbContext authDbContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _roleManager = roleManager;
            _authDbContext = authDbContext;
        }

        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model, string returnUrl = null)
        {
            Console.WriteLine("Login");
            if (!ModelState.IsValid)
                return View(model);

            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.UserName == model.UserName);
            if (user == null)
            {
                ModelState.AddModelError(string.Empty, "無效的登入嘗試");
                return View(model);
            }

            var result = await _signInManager.PasswordSignInAsync(user, model.Password, model.RememberMe, lockoutOnFailure: false);

            if (result.Succeeded)
            {
                return RedirectToLocal(returnUrl);
            }
            else
            {
                ModelState.AddModelError(string.Empty, "登入失敗，請檢查您的帳號和密碼");
                return View(model);
            }
        }

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }
        [HttpPost]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                EmailConfirmed = true // ✅ 預設 Email 已確認
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, "User");
                await _authDbContext.SaveChangesAsync();
                // ✅ 註冊後自動登入
                await _signInManager.SignInAsync(user, isPersistent: false);
                return RedirectToAction("Index", "Home"); // ✅ 註冊成功跳轉首頁
            }

            // ❌ 註冊失敗顯示錯誤訊息
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }

            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return RedirectToAction("Login");
        }

        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
                return Redirect(returnUrl);
            else
                return RedirectToAction("Index", "Home");
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> UpdateRolePermission()
        {
            var roles = await _authDbContext.Roles.Select(r => r.Name).ToListAsync();
            var adminRole = await _authDbContext.Roles.Where(r => r.Name == "Admin").FirstAsync();
            var updateRole = new UpdateRolePermission
            {
                Roles = roles,
                RoleId = adminRole.Id,
                RoleName = adminRole.Name,
                Permissions = await _authDbContext.RolePermissions
                        .Where(rp => rp.RoleId == adminRole.Id)
                        .Select(rp => new Permissions
                        {
                            PermissionName = rp.Permission.Name,
                            Read = rp.Read,
                            Create = rp.Create,
                            Update = rp.Update,
                            Delete = rp.Delete,
                            Export = rp.Export
                        })
                        .ToListAsync()
            };
            return View(updateRole);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateRolePermission([FromForm] UpdateRolePermission updateRoles)
        {
            if(updateRoles == null)
            {
                Console.WriteLine("updateRoles is null");
            }
            var rolePermissions = await _authDbContext.RolePermissions
                .Where(rp => rp.RoleId == updateRoles.RoleId)
                .Include(rp => rp.Permission)
                .ToListAsync();
            foreach(var permission in updateRoles.Permissions)
            {
                var existingPermission = rolePermissions.FirstOrDefault(rp => rp.Permission.Name == permission.PermissionName);
                if (existingPermission != null)
                {
                    existingPermission.Read = permission.Read;
                    existingPermission.Create = permission.Create;
                    existingPermission.Update = permission.Update;
                    existingPermission.Delete = permission.Delete;
                    existingPermission.Export = permission.Export;
                }
            }

            var roweffected = await _authDbContext.SaveChangesAsync();

            return Ok();
        }

        [HttpGet]
        public async Task<IActionResult> GetRolePermissions(string roleName)
        {
            var role = await _authDbContext.Roles.Where(r => r.Name == roleName).FirstOrDefaultAsync();
            if (role == null)
            {
                return NotFound();
            }

            var rolePermissions = await _authDbContext.RolePermissions
                .Where(rp => rp.RoleId == role.Id)
                .Select(rp => new Permissions
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


        [HttpGet]
        public async Task<IActionResult> CreateRolePermission()
        {
            var permissions = await _authDbContext.Permissions
                .Select(p => new PermissionDto
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

                var model = new CreateRolePermission
                {
                    Permissions = permissions
                };

            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRolePermission(CreateRolePermission model)
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
    }
}
