using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using RMIS.Repositories;

namespace RMIS.Controllers
{
    public class AdminController : Controller
    {
        private readonly AdminInterface _adminInterface;

        public AdminController(AdminInterface adminInterface)
        {
            _adminInterface = adminInterface;
        }

        [HttpGet]
        public IActionResult AddSystem()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> AddPipeline()
        {
            var input = await _adminInterface.getPipelineInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddPipeline(AddPipelineInput pipelineInput)
        {
            var rowsAffected = await _adminInterface.AddPipelineAsync(pipelineInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddPipeline", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddPipeline", "Admin");
        }

        
        [HttpGet]
        public async Task<IActionResult> AddRoad()
        {
            var input = await _adminInterface.getRoadInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddRoad(AddRoadInput roadInput)
        {
            var rowsAffected = await _adminInterface.AddRoadAsync(roadInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddRoad", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddRoad", "Admin");
        }

        [HttpGet]
        public async Task<IActionResult> AddRoadByCSV()
        {
            var input = await _adminInterface.getRoadByCSVInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddRoadByCSV(AddRoadByCSVInput roadbycsvInput)
        {
            var rowsAffected = await _adminInterface.AddRoadByCSVAsync(roadbycsvInput);
            if (rowsAffected > 0)
            {
                return RedirectToAction("AddRoadByCSV", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }
            return RedirectToAction("AddRoadByCSV", "Admin");
        }

        [HttpGet]
        public async Task<IActionResult> AddCategory()
        {
            var input = await _adminInterface.getCategoryInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddCategory(AddCategoryInput categoryInput)
        {
            var rowsAffected = await _adminInterface.AddCategoryAsync(categoryInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddCategory", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddCategory", "Admin");
        }

        [HttpGet]
        public IActionResult AddMapSource()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddMapSource(AddMapSourceInput mapsourceInput)
        {
            var rowsAffected = await _adminInterface.AddMapSourceAsync(mapsourceInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddMapSource", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddMapSource", "Admin");
        }

        [HttpGet] 
        public IActionResult AddCategoryByJson()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddCategoryByJson(AddCategoryByJsonInput categoryByJsonInput)
        {
            // 讀取上傳的檔案內容
            using var stream = categoryByJsonInput.categoryWithpipeline.OpenReadStream();
            using var reader = new StreamReader(stream);
            var jsonContent = await reader.ReadToEndAsync();

            // 將 JSON 反序列化為物件
            var rawData = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, Dictionary<string, List<string>>>>(jsonContent);

            if (rawData == null)
            {
                return BadRequest("無效的JSON格式。");
            }

            // 建立分類和管線的集合
            var categories = new List<Category>();
            foreach (var outerCategory in rawData)
            {
                // 外層分類
                var parentCategory = new Category
                {
                    Id = Guid.NewGuid(),
                    Name = outerCategory.Key,
                    OrderId = categories.Count + 1
                };

                foreach (var subCategory in outerCategory.Value)
                {
                    // 子分類
                    var childCategory = new Category
                    {
                        Id = Guid.NewGuid(),
                        Name = subCategory.Key,
                        ParentId = parentCategory.Id,
                        Parent = parentCategory,
                        OrderId = parentCategory.Subcategories.Count + 1
                    };

                    foreach (var pipelineName in subCategory.Value)
                    {
                        // 管線
                        var pipeline = new Pipeline
                        {
                            Id = Guid.NewGuid(),
                            Name = pipelineName,
                            CategoryId = childCategory.Id,
                            Category = childCategory,
                            Color = "DefaultColor" // 可以根據需要設置顏色
                        };

                        // 將管線添加到子分類
                        childCategory.Subcategories.Add(new Category
                        {
                            Id = Guid.NewGuid(),
                            Name = pipelineName,
                            ParentId = childCategory.Id,
                            Parent = childCategory
                        });
                    }

                    // 添加子分類到父分類
                    parentCategory.Subcategories.Add(childCategory);
                }

                // 添加外層分類到集合
                categories.Add(parentCategory);
            }

            // 儲存資料到資料庫 (假設使用 Entity Framework)
            // _dbContext 是您的 DbContext
            await _dbContext.Categories.AddRangeAsync(categories);
            await _dbContext.SaveChangesAsync();

            return RedirectToAction("AddCategoryByJson", "Admin");
        }
    }
}