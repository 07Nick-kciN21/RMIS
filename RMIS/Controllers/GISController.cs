using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using RMIS.Data;
using RMIS.Models.Auth;
using RMIS.Repositories;

namespace RMIS.Controllers
{
    public class GISController : Controller
    {
        private readonly MapDBContext _mapDBContext;
        private readonly AccountInterface _accountInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<HomeController> _logger;

        public GISController(AccountInterface accountInterface, MapDBContext mapDBContext, UserManager<ApplicationUser> userManager, ILogger<HomeController> logger)
        {
            _mapDBContext = mapDBContext;
            _accountInterface = accountInterface;
            _userManager = userManager;
            _logger = logger;
        }
        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var currentUser = await _userManager.GetUserAsync(User);

            if (currentUser != null)
            {
                ViewBag.Username = currentUser.UserName;
                // 從user取得role資料與部門(基本上一個user只有一個role)
                var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
                var userPermissions = await _accountInterface.GetUserPermissions(userInfo.roleId);
                return View(userPermissions);
            }

            Console.WriteLine("Index page loaded");
            return View();
        }
    }
}
