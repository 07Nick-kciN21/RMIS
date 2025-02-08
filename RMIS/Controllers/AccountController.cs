using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using System.Linq;
using System.Threading.Tasks;
using RMIS.Models.Auth;
using RMIS.Models.Account;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Runtime.Intrinsics.X86;

namespace RMIS.Controllers
{

    public class AccountController : Controller
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AuthDbContext _authDbContext;

        public AccountController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, AuthDbContext authDbContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _authDbContext = authDbContext;
        }

        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model)
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
                Console.WriteLine($"{model.UserName} 登入成功");
                return RedirectToAction("Index", "Home");
            }
            else
            {
                Console.WriteLine("登入失敗，請檢查您的帳號和密碼");
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
    }
}
