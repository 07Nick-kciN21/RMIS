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
    public class PortalController : Controller
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        public PortalController(SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager) 
        {
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
