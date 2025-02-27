using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using RMIS.Repositories;
using System.Data;
using System.Security;

namespace RMIS.Controllers
{
    /// <summary>
    /// 入口網站(登入、註冊)
    /// </summary>
    /// <returns></returns>
    public class PortalController : Controller
    {
        private readonly AccountInterface _accountInterface;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        public PortalController(AccountInterface accountInterface, SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager) 
        {
            _accountInterface = accountInterface;
            _signInManager = signInManager;
            _userManager = userManager;
        }

        [HttpGet]
        public IActionResult Login()
        {
            Console.WriteLine("Login");
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginView model, string returnUrl = null)
        {
            Console.WriteLine("Login");
            if (!ModelState.IsValid)
                return View(model);

            var user = await _userManager.Users.FirstAsync(u => u.UserName == model.UserName);
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
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return RedirectToAction("Login");
        }

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterUser user)
        {
            if (!ModelState.IsValid)
                return View(user);

            var createUser = new CreateUser
            {
                DisplayName = user.DisplayName,
                Account = user.Account,
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
    }
}
