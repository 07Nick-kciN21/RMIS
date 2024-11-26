using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using RMIS.Repositories;
using System.Text;

namespace RMIS.Controllers
{
    public class AdminController : Controller
    {
        private readonly AdminInterface _adminInterface;
        private readonly ILogger<AdminController> _logger;

        public AdminController(AdminInterface adminInterface, ILogger<AdminController> logger)
        {
            _adminInterface = adminInterface;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> AddPipeline()
        {
            var input = await _adminInterface.getPipelineInput();
            _logger.LogInformation("AddPipeline page loaded");
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddPipeline(AddPipelineInput pipelineInput)
        {
            var rowsAffected = await _adminInterface.AddPipelineAsync(pipelineInput);

            if (rowsAffected > 0)
            {
                _logger.LogInformation($"Add {rowsAffected} Pipeline data to Database");
                return RedirectToAction("AddPipeline", "Admin");
            }
            else
            {
                _logger.LogInformation($"No changes were made to the database.");
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
                _logger.LogInformation($"Add {rowsAffected} Road data to Database");
                return RedirectToAction("AddRoad", "Admin");
            }
            else
            {
                _logger.LogInformation($"No changes were made to the database.");
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
                _logger.LogInformation($"Add {rowsAffected} Road data from CSV to Database");
                TempData["rowCount"] = rowsAffected;
                return RedirectToAction("AddRoadByCSV", "Admin");
            }
            else
            {
                _logger.LogInformation($"No changes were made to the database.");
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
                _logger.LogInformation($"Add {rowsAffected} Category data to Database");
                return RedirectToAction("AddCategory", "Admin");
            }
            else
            {
                _logger.LogInformation($"No changes were made to the database.");
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
                _logger.LogInformation($"Add {rowsAffected} MapSource data to Database");
                return RedirectToAction("AddMapSource", "Admin");
            }
            else
            {
                _logger.LogInformation($"No changes were made to the database.");
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

                if (result.categoryCount > 0 || result.pipelineCount > 0)
                {
                    _logger.LogInformation($"Add {result.categoryCount} Category and {result.pipelineCount} Pipeline data from JSON to Database");
                    TempData["categoryCount"] = result.categoryCount;
                    TempData["pipelineCount"] = result.pipelineCount;
                }
                else if (result.categoryCount == -1 && result.pipelineCount == -1)
                {
                    _logger.LogError("An error occurred while processing the JSON file. All changes have been discarded.");
                    ModelState.AddModelError("categoryWithpipeline", "發生錯誤，所有變更已被捨棄。");
                    return View();
                }
                else
                {
                    _logger.LogInformation($"No changes were made to the database.");
                }
                return RedirectToAction("AddCategoryByJson", "Admin");
            }
        }
    }
}