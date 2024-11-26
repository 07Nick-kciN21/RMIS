using Microsoft.AspNetCore.Mvc;
using RMIS.Data;
using RMIS.Models;
using System.Diagnostics;
using Newtonsoft.Json.Linq;
using RMIS.Models.sql;

namespace RMIS.Controllers
{
    public class HomeController : Controller
    {
        private readonly MapDBContext _mapDBContext;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<HomeController> _logger;

        public HomeController(MapDBContext mapDBContext, IWebHostEnvironment webHostEnvironment, ILogger<HomeController> logger)
        {
            _mapDBContext = mapDBContext;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Index()
        {
            var allCategories = _mapDBContext.Categories.Where(c => c.Id != Guid.Parse("E2726075-D228-4A6B-BC65-0D3D28877681")).ToList();
            var jsTreeData = BuildJsTreeData(allCategories, null);
            ViewBag.JsTreeData = jsTreeData;
            ViewBag.pipelineId = _mapDBContext.Pipelines.Select(p => new
            {
                id = p.Id
            }).ToList();
            _logger.LogInformation("Index page loaded");
            return View();
        }

        private List<object> BuildJsTreeData(IEnumerable<Category> categories, Guid? parentId)
        {
            var result = new List<object>();

            // ��ܷ�e�h�Ū�����
            var currentCategories = categories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
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
                var currentPipelines = _mapDBContext.Pipelines.Where(p => p.CategoryId == category.Id).ToList();
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
