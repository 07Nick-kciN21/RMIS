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
    /// ����
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
                ViewBag.Username = currentUser.DisplayName;
                // �quser���orole��ƻP����(�򥻤W�@��user�u���@��role)
                var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
                var userPermissions = await _accountInterface.GetUserPermissions(userInfo.roleId);
                return View(userPermissions);
            }

            return RedirectToAction("Login", "Portal");
        }

        [HttpGet]
        public async Task<IActionResult> Test()
        {

            var currentUser = await _userManager.GetUserAsync(User);

            if (currentUser != null)
            {
                ViewBag.Username = currentUser.DisplayName;
                // �quser���orole��ƻP����(�򥻤W�@��user�u���@��role)
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
            // �quser���orole��ƻP����(�򥻤W�@��user�u���@��role)

            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.departmentName != "�ݽT�{")
            {
                // ���o�Ҧ��㦳�����N������Categories
                var allCategories = await _mapDBContext.Categories
                    .Where(c => 
                        c.DepartmentIds.Contains(userInfo.departmentId)
                     ).ToListAsync();
                var jsTreeData = BuildJsTreeData(allCategories, null, userInfo.departmentId);
                return Json(new { menuData = jsTreeData});
            }
            return null;
        }
        private List<object> BuildJsTreeData(List<Category> allCategories, int? parentId, int deptId)
        {
            var result = new List<object>();
            // ��ܷ��e�h�Ū�����
            var currentCategories = allCategories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
            foreach (var category in currentCategories)
            {
                // �Ыؤ����`�I
                var categoryNode = new
                {
                    id = category.Id.ToString(),
                    text = category.Name,
                    parent = parentId.HasValue ? parentId.Value.ToString() : "#",
                    children = new List<object>(),
                    tag = "node"
                };

                // ����Ӥ����U���Ҧ��޹D
                var currentPipelines = _mapDBContext.Pipelines
                    .Where(p => p.CategoryId == category.Id && 
                           p.DepartmentIds.Contains(deptId)).ToList();
                foreach (var pipeline in currentPipelines)
                {
                    // ���C�Ӻ޹D�Ыظ`�I
                    var pipelineNode = new
                    {
                        id = pipeline.Id.ToString(),
                        text = pipeline.Name,
                        parent = category.Id.ToString(),
                        children = false, // �޹D���A���l�`�I�A�]�w children �� false
                        tag = "pipeline"
                    };

                    // �N�޹D�`�I�K�[������� children ��
                    ((List<object>)categoryNode.children).Add(pipelineNode);
                }

                // �B�z�Ӥ������l����
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
