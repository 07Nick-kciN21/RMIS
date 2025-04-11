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
        private readonly PortalInterface _portalInterface;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<PortalController> _logger;
        public PortalController(AccountInterface accountInterface, SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, PortalInterface portalInterface, ILogger<PortalController> logger = null)
        {
            _accountInterface = accountInterface;
            _signInManager = signInManager;
            _userManager = userManager;
            _portalInterface = portalInterface;
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Login()
        {
            _logger.LogInformation("Login");
            Console.WriteLine("Login");
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginView model, string returnUrl = null)
        {
            Console.WriteLine("Login");
            if (!ModelState.IsValid)
                return View(model);

            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.UserName == model.UserName);
            if (user == null)
            {
                ModelState.AddModelError(string.Empty, "登入失敗，帳號或密碼錯誤，或著該帳號遭到禁用");
                return View(model);
            }

            var result = await _signInManager.PasswordSignInAsync(user, model.Password, true, lockoutOnFailure: false);
            var statusCheck = await _accountInterface.CheckStatus(user);
            if (result.Succeeded && statusCheck)
            {
                var expireTime = DateTime.UtcNow.AddMinutes(30);
                Response.Cookies.Append("LoginExpireTime", expireTime.ToString("o"),
                       new CookieOptions { Expires = expireTime, HttpOnly = false });

                ViewBag.Username = model.UserName;
                return RedirectToLocal(returnUrl);
            }
            else
            {
                ModelState.AddModelError(string.Empty, "登入失敗，帳號或密碼錯誤，或著該帳號遭到禁用");
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
        public async Task<IActionResult> RegisterSelect()
        {
            try
            {
                _logger.LogInformation("🔍 [RegisterSelect] 開始執行，使用者是否已登入：{IsAuth}", User.Identity.IsAuthenticated);

                var selectList = await _portalInterface.RegisterSelectListAsync();

                if (selectList == null)
                {
                    _logger.LogInformation("⚠️ [RegisterSelect] selectList 為 null！");
                    return BadRequest("selectList is null");
                }

                _logger.LogInformation("✅ [RegisterSelect] 成功取得資料");
                
                return Json(selectList);
            }
            catch (Exception ex)
            {
                _logger.LogInformation(ex, "❌ [RegisterSelect] 發生例外錯誤");
                return StatusCode(500, "伺服器錯誤，請稍後再試。");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterVIew user)
        {
            if (!ModelState.IsValid)
            {
                ViewData["ShowRegisterModal"] = "True";
                return View("Login", new LoginRegisterView
                {
                    Register = user,
                    Login = new LoginView()
                });
            }

            var result = await _portalInterface.RegisterAsync(user);

            if (result.Success)
            {
                return Json(new { Success = true, Message = "提交申請" });
            }
            else
            {
                // ✅ 透過 ViewData 讓錯誤訊息顯示在 `Register` View
                // ViewData["ErrorMessage"] = result.Message;
                return Json(new { Success = false, Message = result.Message }); ;
            }
        }

        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
                return Redirect(returnUrl);
            else
                return RedirectToAction("Index", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> ExtendSession()
        {
            if (User.Identity.IsAuthenticated)
            {
                var newExpireTime = DateTime.UtcNow.AddMinutes(30); // 設定新的過期時間
                Response.Cookies.Append("LoginExpireTime", newExpireTime.ToString("o"),
                    new CookieOptions { Expires = newExpireTime, HttpOnly = false });
                var currentUser = await _userManager.GetUserAsync(User);
                _signInManager.SignInAsync(currentUser, isPersistent: true).Wait(); // 重新設定身份驗證

                return Ok(new { expiresUtc = newExpireTime });
            }
            return Unauthorized();
        }
    }
}
