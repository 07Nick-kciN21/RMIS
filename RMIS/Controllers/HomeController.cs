using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RMIS.Data;
using RMIS.Models;
using RMIS.Models.sql;
using System.Diagnostics;
using Newtonsoft.Json.Linq;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RMIS.Models.Auth;
using System.Data;
using System.Threading;
using System.Linq;
using RMIS.Repositories;

namespace RMIS.Controllers
{
    /// <summary>
    /// 首頁
    /// </summary>
    /// <returns></returns>
    public class HomeController : Controller
    {
        private readonly MapDBContext _mapDBContext;
        private readonly AccountInterface _accountInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<HomeController> _logger;

        public HomeController(AccountInterface accountInterface, MapDBContext mapDBContext, UserManager<ApplicationUser> userManager, ILogger<HomeController> logger)
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
        [HttpGet]
        public async Task<IActionResult> BuildTreeData()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 從user取得role資料與部門(基本上一個user只有一個role)

            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.departmentName != "待確認")
            {
                // 取得所有具有部門代號的根Categories
                var allCategories = await _mapDBContext.Categories
                    .Where(c => 
                        c.DepartmentIds.Contains(userInfo.departmentId)
                     ).ToListAsync();
                var jsTreeData = BuildJsTreeData(allCategories, null, userInfo.departmentId);
                return Json(new { menuData = jsTreeData});
            }
            return null;
        }
        private List<object> BuildJsTreeData(List<Category> allCategories, Guid? parentId, int deptId)
        {
            var result = new List<object>();
            // 選擇當前層級的分類
            var currentCategories = allCategories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
            foreach (var category in currentCategories)
            {
                // 創建分類節點
                var categoryNode = new
                {
                    id = category.Id.ToString(),
                    text = category.Name,
                    parent = parentId.HasValue ? parentId.Value.ToString() : "#",
                    children = new List<object>(),
                    tag = "node"
                };

                // 獲取該分類下的所有管道
                var currentPipelines = _mapDBContext.Pipelines
                    .Where(p => p.CategoryId == category.Id && 
                           p.DepartmentIds.Contains(deptId)).ToList();
                foreach (var pipeline in currentPipelines)
                {
                    // 為每個管道創建節點
                    var pipelineNode = new
                    {
                        id = pipeline.Id.ToString(),
                        text = pipeline.Name,
                        parent = category.Id.ToString(),
                        children = false, // 管道不再有子節點，設定 children 為 false
                        tag = "pipeline"
                    };

                    // 將管道節點添加到分類的 children 中
                    ((List<object>)categoryNode.children).Add(pipelineNode);
                }

                // 處理該分類的子分類
                var childCategories = BuildJsTreeData(allCategories, category.Id, deptId);
                if (childCategories.Any())
                {
                    ((List<object>)categoryNode.children).AddRange(childCategories);
                }
                result.Add(categoryNode);
            }
            return result;
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
