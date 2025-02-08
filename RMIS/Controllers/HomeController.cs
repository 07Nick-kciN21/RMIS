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


namespace RMIS.Controllers
{
    [Authorize]
    public class HomeController : Controller
    {
        private readonly MapDBContext _mapDBContext;
        private readonly AuthDbContext _authDBContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<HomeController> _logger;

        public HomeController(MapDBContext mapDBContext, AuthDbContext authDBContext, UserManager<ApplicationUser> userManager, ILogger<HomeController> logger)
        {
            _mapDBContext = mapDBContext;
            _authDBContext = authDBContext;
            _userManager = userManager;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var allCategories = _mapDBContext.Categories.Where(c => c.Id != Guid.Parse("E2726075-D228-4A6B-BC65-0D3D28877681")).ToList();
            var jsTreeData = BuildJsTreeData(allCategories, null);
            ViewBag.JsTreeData = jsTreeData;
            ViewBag.pipelineId = _mapDBContext.Pipelines.Select(p => new
            {
                id = p.Id
            }).ToList();
            _logger.LogInformation("Index page loaded");

            var userPermissions = new Dictionary<string, string>();

            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                // 從user取得roleId(基本上一個user只有一個role)
                var roleId = (await _userManager.GetRolesAsync(user))
                             .Select(roleName => _authDBContext.Roles.FirstOrDefault(r => r.Name == roleName).Id)
                             .FirstOrDefault();
                // 根據roleId取得PermissionId與他的AccessLevel
                // 取得該角色對應的權限及 AccessLevel
                var permissions = await _authDBContext.RolePermissions
                    .Where(rp => rp.RoleId == roleId)
                    .Select(rp => new { rp.Permission.Name, rp.AccessLevel })
                    .ToListAsync();

                userPermissions = permissions.ToDictionary(p => p.Name, p => p.AccessLevel);
            }

            Console.WriteLine("Index page loaded");
            return View(userPermissions);
        }

        private List<object> BuildJsTreeData(IEnumerable<Category> categories, Guid? parentId)
        {
            var result = new List<object>();

            // 選擇當前層級的分類
            var currentCategories = categories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
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
                var currentPipelines = _mapDBContext.Pipelines.Where(p => p.CategoryId == category.Id).ToList();
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
                var childCategories = BuildJsTreeData(categories, category.Id);
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
