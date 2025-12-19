using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Account;
using RMIS.Models.Auth;
using RMIS.Models.Portal;
using RMIS.Repositories;
using RMIS.Helpers; // 新增：引入 LogHelper
using System.Data;
using System.Drawing.Imaging;
using System.Drawing;
using System.Security;
using System.Drawing.Drawing2D;
using RMIS.Models.Account.Users;
using Microsoft.AspNetCore.Identity.UI.Services;
using OfficeOpenXml.FormulaParsing.LexicalAnalysis;

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
        private readonly IEmailSender _emailSender;

        public PortalController(AccountInterface accountInterface, SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, PortalInterface portalInterface, ILogger<PortalController> logger = null, IEmailSender emailSender = null)
        {
            _accountInterface = accountInterface;
            _signInManager = signInManager;
            _userManager = userManager;
            _portalInterface = portalInterface;
            _logger = logger;
            _emailSender = emailSender;
        }

        [HttpGet]
        public IActionResult Captcha(string type)
        {
            string code = GenerateRandomCode(5);
            HttpContext.Session.SetString($"CaptchaCode_{type}", code);

            using var bmp = new Bitmap(120, 40);
            using var graphics = Graphics.FromImage(bmp);
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            graphics.Clear(Color.White);

            // 隨機旋轉每個字母
            var rand = new Random();
            using var font = new Font("Arial", 20, FontStyle.Bold);
            for (int i = 0; i < code.Length; i++)
            {
                float angle = rand.Next(-20, 20); // -20~20度
                graphics.TranslateTransform(20 * i + 15, 20); // 移動到字母位置
                graphics.RotateTransform(angle);
                graphics.DrawString(code[i].ToString(), font, Brushes.Black, -10, -10);
                graphics.ResetTransform();
            }

            // 加干擾線
            for (int i = 0; i < 3; i++)
            {
                Pen pen = new Pen(Color.FromArgb(rand.Next(50, 150), rand.Next(50, 150), rand.Next(50, 150)), 1);
                graphics.DrawLine(pen,
                    rand.Next(bmp.Width), rand.Next(bmp.Height),
                    rand.Next(bmp.Width), rand.Next(bmp.Height));
            }

            // 加一些雜點
            for (int i = 0; i < 30; i++)
            {
                int x = rand.Next(bmp.Width);
                int y = rand.Next(bmp.Height);
                bmp.SetPixel(x, y, Color.FromArgb(rand.Next(256), rand.Next(256), rand.Next(256)));
            }

            using var ms = new MemoryStream();
            bmp.Save(ms, ImageFormat.Png);
            return File(ms.ToArray(), "image/png");
        }

        private string GenerateRandomCode(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var random = new Random();
            return new string(Enumerable.Range(0, length)
                .Select(_ => chars[random.Next(chars.Length)]).ToArray());
        }


        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginView model, string loginCaptcha, string returnUrl = null)
        {
            var clientIp = HttpContext.GetClientIpAddress();
            string? storedCode = HttpContext.Session.GetString("CaptchaCode_login");

            if (storedCode == null || loginCaptcha.ToUpper() != storedCode.ToUpper())
            {
                _logger?.LogOperation("Login-POST", false, "驗證碼錯誤", model?.UserName ?? "Unknown", clientIp);
                ModelState.AddModelError("", "驗證碼錯誤");
                return View();
            }
            if (!ModelState.IsValid)
            {
                foreach (var kvp in ModelState)
                {
                    var key = kvp.Key;
                    foreach (var error in kvp.Value.Errors)
                    {
                        _logger?.LogOperation("Login-POST", false, $"ModelState錯誤 - Field={key}, Error={error.ErrorMessage}", model?.UserName ?? "Unknown", clientIp);
                    }
                }
                return View(model);
            }
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.UserName == model.UserName);
            // 1. 帳號不存在
            if (user == null)
            {
                _logger?.LogOperation("Login-POST", false, "帳號不存在", model.UserName, clientIp);
                ModelState.AddModelError(string.Empty, "帳號或密碼錯誤");
                return View(model);
            }

            // 2. 密碼錯誤
            var result = await _signInManager.PasswordSignInAsync(user, model.Password, true, lockoutOnFailure: false);
            if (!result.Succeeded)
            {
                _logger?.LogOperation("Login-POST", false, "密碼錯誤", model.UserName, clientIp);
                ModelState.AddModelError(string.Empty, "帳號或密碼錯誤");
                return View(model);
            }

            // 3. 尚未驗證信箱
            if (!user.EmailConfirmed)
            {
                _logger?.LogOperation("Login-POST", false, "尚未驗證信箱", model.UserName, clientIp);
                ModelState.AddModelError(string.Empty, "此帳號尚未通過信箱驗證");
                return View(model);
            }

            // 4. 帳號狀態為停用
            var statusCheck = await _accountInterface.CheckStatus(user);
            if (!statusCheck)
            {
                _logger?.LogOperation("登入", false, "帳號未啟用", model.UserName, clientIp);
                ModelState.AddModelError(string.Empty, "此帳號尚未啟用，請聯繫管理員");
                return View(model);
            }

            // 5. 成功登入，設定 Cookie
            var expireTime = DateTime.UtcNow.AddMinutes(30);
            Response.Cookies.Append("LoginExpireTime", expireTime.ToString("o"),
                new CookieOptions { Expires = expireTime, HttpOnly = false });

            _logger?.LogOperation("登入", true, "使用者登入", model.UserName, clientIp);
            ViewBag.Username = model.UserName;
            return RedirectToLocal(returnUrl);
        }

        private IActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
                return Redirect(returnUrl);
            else
                return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            var userName = User.Identity?.Name ?? "Unknown";
            var clientIp = HttpContext.GetClientIpAddress();
            await _signInManager.SignOutAsync();
            _logger?.LogOperation("Logout", true, "使用者登出", userName, clientIp);
            return RedirectToAction("Login");
        }

        [HttpGet]
        public async Task<IActionResult> RegisterSelect()
        {
            try
            {
                var selectList = await _portalInterface.RegisterSelectListAsync();

                if (selectList == null)
                {
                    _logger?.LogOperation("RegisterSelect", false, "selectList 為 null");
                    return BadRequest("selectList is null");
                }

                return Json(selectList);
            }
            catch (Exception ex)
            {
                _logger?.LogOperation("RegisterSelect", false, "發生例外錯誤", ex.Message);
                return StatusCode(500, "伺服器錯誤，請稍後再試。");
            }
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterView user, string registerCaptcha)
        {
            var clientIp = HttpContext.GetClientIpAddress();
            var code = HttpContext.Session.GetString("CaptchaCode_register");
            if (string.IsNullOrEmpty(code) || !string.Equals(code, registerCaptcha, StringComparison.OrdinalIgnoreCase))
            {
                _logger?.LogOperation("註冊", false, "驗證碼錯誤", user?.Account ?? "Unknown", clientIp);
                return Json(new { success = false, message = "驗證碼錯誤" });
            }

            if (!ModelState.IsValid)
            {
                foreach (var kvp in ModelState)
                {
                    var key = kvp.Key;
                    foreach (var error in kvp.Value.Errors)
                    {
                        _logger?.LogOperation("註冊", false, $"ModelState錯誤 - Field={key}, Error={error.ErrorMessage}", user?.Account ?? "Unknown", clientIp);
                    }
                }

                ViewData["ShowRegisterModal"] = "True";
                return View("Login", new LoginView());
            }

            var result = await _portalInterface.RegisterAsync(user);

            if (result.Success)
            {
                var userEntity = await _userManager.FindByNameAsync(user.Account);
                var token = await _userManager.GenerateEmailConfirmationTokenAsync(userEntity);
                var confirmLink = Url.Action("ConfirmEmail", "Portal",
                    new { userId = userEntity.Id, token = token },
                    protocol: Request.Scheme);

                await _emailSender.SendEmailAsync(user.Email, "請驗證您的電子郵件",
                    $"請點擊以下連結完成信箱驗證：<a href='{confirmLink}'>驗證信箱</a>");

                _logger?.LogOperation("註冊", true, "新使用者註冊成功並寄送驗證信", user.Account, clientIp);
                return Json(new { Success = true, Message = "提交申請，請完成信箱認證並等待管理員確認" });
            }
            else
            {
                _logger?.LogOperation("註冊", false, $"註冊失敗: {result.Message}", user.Account, clientIp);
                return Json(new { Success = false, Message = result.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> ForgotPassword(string account, string forgetCaptcha)
        {
            // 1. 驗證 Captcha
            var code = HttpContext.Session.GetString("CaptchaCode_forget");
            if (string.IsNullOrEmpty(code) || !string.Equals(code, forgetCaptcha, StringComparison.OrdinalIgnoreCase))
            {
                _logger?.LogOperation("ForgotPassword", false, "驗證碼錯誤", account ?? "Unknown");
                return Json(new { success = false, message = "驗證碼錯誤" });
            }

            // 2. 用 UserName 找使用者
            var user = await _userManager.FindByNameAsync(account);
            if (user == null || !string.Equals(user.UserName, account, StringComparison.Ordinal))
            {
                _logger?.LogOperation("ForgotPassword", false, "帳號不存在", account);
                // 安全考量：不要提示帳號不存在，避免被人暴力探測
                return Json(new { success = true, message = "帳號不存在" });
            }

            // 3. 產生 Token
            var result = await _portalInterface.GenerateResetPasswordTokenAsync(account);

            if (!result.Success)
            {
                _logger?.LogOperation("ForgotPassword", false, $"產生Token失敗: {result.Message}", account);
                return Json(new { success = false, message = result.Message });
            }

            // 4. 建立 Reset URL（在 Controller 使用 Url.Action）
            var resetLink = Url.Action("ResetPassword", "Portal",
                new { token = result.Token, email = user.Email, account = user.UserName },
                protocol: Request.Scheme);

            // 5. 寄信
            await _emailSender.SendEmailAsync(user.Email, "重設密碼",
                $"請點擊以下連結重設密碼：<a href='{resetLink}'>重設密碼</a>");

            // 6. 處理 Email 遮罩
            var maskedEmail = MaskEmail(user.Email);

            _logger?.LogOperation("ForgotPassword", true, "重設密碼連結已寄送", account);
            return Json(new
            {
                success = true,
                message = $"重設密碼連結已寄送至信箱：{maskedEmail}，請於 5分鐘 內完成操作"
            });
        }

        private string MaskEmail(string email)
        {
            if (string.IsNullOrEmpty(email) || !email.Contains("@"))
                return email;

            var parts = email.Split('@');
            var name = parts[0];
            var domain = parts[1];

            // 保留前 1~2 個字元，其他用 * 代替
            string maskedName;
            if (name.Length <= 2)
            {
                maskedName = name[0] + new string('*', name.Length - 1);
            }
            else
            {
                maskedName = name.Substring(0, 2) + new string('*', name.Length - 2);
            }

            return $"{maskedName}@{domain}";
        }

        [HttpGet]
        public async Task<IActionResult> ResetPassword(string token, string email, string account)
        {
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(account))
            {
                _logger?.LogOperation("ResetPassword-GET", false, "缺少必要參數", account ?? "Unknown");
                return View("ResetPasswordInvalid");
            }

            var user = await _userManager.FindByNameAsync(account);
            if (user == null || !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
            {
                _logger?.LogOperation("ResetPassword-GET", false, $"使用者不存在或Email不匹配", account);
                return View("ResetPasswordInvalid");
            }

            // 預先檢查 token 是否有效
            var isValid = await _userManager.VerifyUserTokenAsync(
                user,
                _userManager.Options.Tokens.PasswordResetTokenProvider,
                "ResetPassword",
                token);

            if (!isValid)
            {
                _logger?.LogOperation("ResetPassword-GET", false, "Token無效或已過期", account);
                return View("ResetPasswordExpired");
            }

            return View(new ResetPasswordViewModel
            {
                Token = token,
                Email = email,
                Account = account
            });
        }

        [HttpPost]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                _logger?.LogOperation("重設密碼", false, "ModelState驗證失敗", model?.Account ?? "Unknown");
                return View(model);
            }

            var user = await _userManager.FindByNameAsync(model.Account);
            if (user == null || !string.Equals(user.Email, model.Email, StringComparison.OrdinalIgnoreCase))
            {
                _logger?.LogOperation("重設密碼", false, "使用者不存在或Email不匹配", model.Account);
                ModelState.AddModelError(string.Empty, "使用者資料不正確");
                return View(model);
            }

            // ✅ 檢查新密碼是否和目前密碼相同
            var passwordCheck = await _userManager.CheckPasswordAsync(user, model.Password);
            if (passwordCheck)
            {
                _logger?.LogOperation("重設密碼T", false, "新密碼與舊密碼相同", model.Account);
                ModelState.AddModelError(string.Empty, "新密碼不可與目前密碼相同");
                return View(model);
            }

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.Password);

            if (result.Succeeded)
            {
                _logger?.LogOperation("重設密碼", true, "密碼重設成功", model.Account);
                return RedirectToAction("ResetPasswordConfirmation");
            }

            foreach (var error in result.Errors)
            {
                _logger?.LogOperation("重設密碼", false, $"密碼重設失敗: {error.Code}, {error.Description}", model.Account);

                if (error.Code == "InvalidToken")
                    return View("ResetPasswordExpired");

                ModelState.AddModelError(string.Empty, error.Description);
            }

            return View(model);
        }

        [HttpGet]
        public IActionResult ResetPasswordConfirmation()
        {
            return View();
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

                _logger?.LogOperation("登入延長", true, "Session已延長", currentUser?.UserName ?? "Unknown");
                return Ok(new { expiresUtc = newExpireTime });
            }

            _logger?.LogOperation("ExtendSession", false, "使用者未驗證", "Unknown");
            return Unauthorized();
        }

        [HttpGet]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
            {
                _logger?.LogOperation("ConfirmEmail", false, "缺少必要參數", userId ?? "Unknown");
                return View("ConfirmEmailFailed");
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger?.LogOperation("ConfirmEmail", false, "找不到使用者", userId);
                return View("ConfirmEmailFailed");
            }

            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (result.Succeeded)
            {
                _logger?.LogOperation("ConfirmEmail", true, "使用者信箱驗證成功", user.UserName);
                return View();
            }
            else
            {
                foreach (var error in result.Errors)
                {
                    _logger?.LogOperation("ConfirmEmail", false, $"驗證失敗: {error.Description}", user.UserName);
                }

                return View("ConfirmEmailFailed");
            }
        }

        [HttpPost]
        public async Task<IActionResult> ResendConfirmationEmail(string account, string emailCaptcha)
        {
            var user = await _userManager.FindByNameAsync(account);
            if (user == null || user.EmailConfirmed)
            {
                _logger?.LogOperation("ResendConfirmationEmail", false, "帳號已通過信箱認證或不存在", account ?? "Unknown");
                ModelState.AddModelError("", "帳號已通過信箱認證");
                return View("ConfirmEmailFailed");
            }

            string? storedCode = HttpContext.Session.GetString("CaptchaCode_login");
            if (storedCode == null || emailCaptcha.ToUpper() != storedCode.ToUpper())
            {
                _logger?.LogOperation("ResendConfirmationEmail", false, "驗證碼錯誤", account);
                ModelState.AddModelError("", "驗證碼錯誤");
                return View();
            }

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var confirmLink = Url.Action("ConfirmEmail", "Portal",
                new { userId = user.Id, token = token },
                protocol: Request.Scheme);

            await _emailSender.SendEmailAsync(user.Email, "請驗證您的電子郵件",
                    $"請點擊以下連結完成信箱驗證：<a href='{confirmLink}'>驗證信箱</a>");

            _logger?.LogOperation("ResendConfirmationEmail", true, "已重新寄送驗證信", account);
            ViewBag.ResendMessage = "已重新寄送驗證信至您的信箱，請查看信件。";
            return View("ConfirmEmailFailed");
        }

        [HttpGet]
        public IActionResult Test()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Test(LoginView model, string loginCaptcha, string returnUrl = null)
        {

            string? storedCode = HttpContext.Session.GetString("CaptchaCode_login");
            if (storedCode == null || loginCaptcha.ToUpper() != storedCode.ToUpper())
            {
                _logger?.LogOperation("登入", false, "驗證碼錯誤", model?.UserName ?? "Unknown");
                ModelState.AddModelError("", "驗證碼錯誤");
                return View();
            }
            if (!ModelState.IsValid)
            {
                foreach (var kvp in ModelState)
                {
                    var key = kvp.Key;
                    foreach (var error in kvp.Value.Errors)
                    {
                        _logger?.LogOperation("登入", false, $"ModelState錯誤 - Field={key}, Error={error.ErrorMessage}", model?.UserName ?? "Unknown");
                    }
                }
                return View(model);
            }
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.UserName == model.UserName);
            // 1. 帳號不存在
            if (user == null)
            {
                _logger?.LogOperation("登入", false, "帳號不存在", model.UserName);
                ModelState.AddModelError(string.Empty, "帳號或密碼錯誤");
                return View(model);
            }

            // 2. 密碼錯誤
            var result = await _signInManager.PasswordSignInAsync(user, model.Password, true, lockoutOnFailure: false);
            if (!result.Succeeded)
            {
                _logger?.LogOperation("登入", false, "密碼錯誤", model.UserName);
                ModelState.AddModelError(string.Empty, "帳號或密碼錯誤");
                return View(model);
            }

            // 3. 尚未驗證信箱
            if (!user.EmailConfirmed)
            {
                _logger?.LogOperation("登入", false, "尚未驗證信箱", model.UserName);
                ModelState.AddModelError(string.Empty, "此帳號尚未通過信箱驗證");
                return View(model);
            }

            // 4. 帳號狀態為停用
            var statusCheck = await _accountInterface.CheckStatus(user);
            if (!statusCheck)
            {
                _logger?.LogOperation("登入", false, "帳號未啟用", model.UserName);
                ModelState.AddModelError(string.Empty, "此帳號尚未啟用，請聯繫管理員");
                return View(model);
            }

            // 5. 成功登入，設定 Cookie
            var expireTime = DateTime.UtcNow.AddMinutes(30);
            Response.Cookies.Append("LoginExpireTime", expireTime.ToString("o"),
                new CookieOptions { Expires = expireTime, HttpOnly = false });

            _logger?.LogOperation("登入", true, "測試登入成功", model.UserName);
            ViewBag.Username = model.UserName;
            return RedirectToLocal(returnUrl);
        }
    }
}