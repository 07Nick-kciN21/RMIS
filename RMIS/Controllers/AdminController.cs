using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using RMIS.Repositories;
using System.Text;
using Newtonsoft.Json.Linq;

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
                TempData["rowCount"] = rowsAffected;
                return RedirectToAction("AddRoadByCSV", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }
            return RedirectToAction("Index", "Home");
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
            if (categoryByJsonInput?.categoryWithpipeline == null || categoryByJsonInput.categoryWithpipeline.Length == 0)
            {
                ModelState.AddModelError("categoryWithpipeline", "請上傳有效的 JSON 檔案。");
                return View();
            }
            
            using (var stream = categoryByJsonInput.categoryWithpipeline.OpenReadStream())
            using (var reader = new StreamReader(stream, Encoding.UTF8)) // 指定 UTF-8 編碼
            {
                var jsonContent = await reader.ReadToEndAsync();
                var jsonToken = JToken.Parse(jsonContent);

                (int categoryCount, int pipelineCount) result = (0, 0);
                if (jsonToken is JObject jObject)
                {
                    result = await _adminInterface.AddCategoryByJsonAsync(jObject);
                    
                }
                if(result.categoryCount > 0 || result.pipelineCount > 0)
                {
                    TempData["categoryCount"] = result.categoryCount;
                    TempData["pipelineCount"] = result.pipelineCount;
                }
                return RedirectToAction("AddCategoryByJson", "Admin");
            }
        }
    }
}