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
        public class PermissionDetail
        {
            public bool Read { get; set; }
            public bool Create { get; set; }
            public bool Update { get; set; }
            public bool Delete { get; set; }
            public bool Export { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var userPermissions = new Dictionary<string, PermissionDetail>();

            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                // 從user取得roleId(基本上一個user只有一個role)
                var roleId = (await _userManager.GetRolesAsync(user))
                             .Select(roleName => _authDBContext.Roles.FirstOrDefault(r => r.Name == roleName).Id)
                             .FirstOrDefault();
                // 取得該角色對應的權限及 CRUDE
                var permissions = await _authDBContext.RolePermissions
                    .Where(rp => rp.RoleId == roleId)
                    .Select(rp => new
                    {
                        rp.Permission.Name,
                        rp.Read,
                        rp.Create,
                        rp.Update,
                        rp.Delete,
                        rp.Export
                    })
                    .ToListAsync();

                userPermissions = permissions.ToDictionary(
                    p => p.Name, 
                    p => new PermissionDetail 
                    {
                        Read = p.Read,
                        Create = p.Create,
                        Update = p.Update,
                        Delete = p.Delete,
                        Export = p.Export
                    });

                var CategoryData = await _authDBContext.RolePermissions
                    .Where(rp => rp.RoleId == roleId && 
                                 rp.Permission.Name.StartsWith("業務圖資"))
                    .Include(rp => rp.Permission)
                    .ToListAsync();

                if (CategoryData[0].Read)
                {
                    var allCategories = _mapDBContext.Categories.Where(c => c.Id != Guid.Parse("E2726075-D228-4A6B-BC65-0D3D28877681") && c.ParentId == null).ToList();
                    // 先篩選具有讀取權限的根節點
                    var allowedCategories = allCategories.Where(c => CategoryData.Any(cd => cd.Permission.Name.Contains(c.Name) && cd.Read)).ToList();
                    var jsTreeData = BuildJsTreeData(allowedCategories, null);
                    ViewBag.JsTreeData = jsTreeData;
                    ViewBag.pipelineId = _mapDBContext.Pipelines.Select(p => new
                    {
                        id = p.Id
                    }).ToList();
                }
                
                _logger.LogInformation("Index page loaded");
            }

            Console.WriteLine("Index page loaded");
            return View(userPermissions);
        }

        private List<object> BuildJsTreeData(IEnumerable<Category> categories, Guid? parentId)
        {
            var result = new List<object>();

            // 選擇當前層級的分類
            // var currentCategories = categories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
            foreach (var category in categories)
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

                var next_category = _mapDBContext.Categories.Where(c => c.ParentId == category.Id).ToList();
                // 處理該分類的子分類
                var childCategories = BuildJsTreeData(next_category, category.Id);
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
