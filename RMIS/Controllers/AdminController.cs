using Azure.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.Auth;
using RMIS.Models.sql;
using RMIS.Repositories;
using System.Security;
using System.Text;
using System.Text.RegularExpressions;

namespace RMIS.Controllers
{
    /// <summary>
    /// 新增圖資、道路、類別、專案等資料
    /// </summary>
    /// <returns></returns>
    public class AdminController : Controller
    {
        private readonly AdminInterface _adminInterface;
        private readonly AccountInterface _accountInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<AdminController> _logger;

        public AdminController(AdminInterface adminInterface, 
                               AccountInterface accountInterface,
                               UserManager<ApplicationUser> userManager, 
                               ILogger<AdminController> logger)
        {
            _adminInterface = adminInterface;
            _accountInterface = accountInterface;
            _userManager = userManager;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> AddCategory()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                var input = await _adminInterface.getCategoryInput(userInfo);
                return View(input);
            }
            return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
        }

        [HttpPost]
        public async Task<IActionResult> AddCategory(AddCategoryInput input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                // 檢查輸入的類別資料是否有問題
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                // 新增類別資料(含管線資料
                var rowsAffected = await _adminInterface.AddCategoryAsync(input);

                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已新增 {rowsAffected} 筆類別資料到資料庫");
                    return Json(new { success = true, message = $"已新增 {rowsAffected} 筆類別資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return Json(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> AddPipeline()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                var input = await _adminInterface.getPipelineInput(userInfo);
                _logger.LogInformation("已載入新增管線頁面");
                return View(input);
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddPipeline(AddPipelineInput input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                _logger.LogInformation($"{currentUser.DisplayName} 無權限新增");
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if(userInfo.roleStatus && userInfo.deptStatus)
            {
                // 檢查輸入的管線資料是否有問題
                var rowsAffected = await _adminInterface.AddPipelineAsync(input);

                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已新增 {rowsAffected} 筆管線資料到資料庫");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆管線資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return Json(new { success = false, message = "未對資料庫進行任何變更" }); ;
                }
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> AddRoad()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if(userInfo.roleStatus && userInfo.deptStatus)
            {
                var input = await _adminInterface.getRoadInput(userInfo);
                return View(input);
            }
            return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
        }

        [HttpPost]
        public async Task<IActionResult> AddRoad(AddRoadInput input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                // 檢查輸入的道路資料是否有問題
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                // 新增道路資料(含管線資料
                var rowsAffected = await _adminInterface.AddRoadAsync(input);

                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已新增 {rowsAffected} 筆道路資料到資料庫");
                    return Ok(new { success = true, message = $"已從CSV新增 {rowsAffected} 筆道路資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return Json(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> AddRoadByCSV()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if(userInfo.roleStatus && userInfo.deptStatus)
            {
                var input = await _adminInterface.getRoadByCSVInput(userInfo);
                return View(input);
            }
            return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
        }

        [HttpPost]
        public async Task<IActionResult> AddRoadByCSV(AddRoadByCSVInput input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                // 檢查輸入的道路資料是否有問題
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                // 新增道路資料(含管線資料
                var rowsAffected = await _adminInterface.AddRoadByCSVAsync(input);
                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已從CSV新增 {rowsAffected} 筆道路資料到資料庫");
                    return Json(new { success = true, message = $"已新增 {rowsAffected} 筆類別資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return Json(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        

        [HttpGet]
        public async Task<IActionResult> AddMapSource()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddMapSource(AddMapSourceInput input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                var rowsAffected = await _adminInterface.AddMapSourceAsync(input);

                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已新增 {rowsAffected} 筆地圖來源資料到資料庫");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆地圖來源資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return Json(new { success = false, message = "未對資料庫進行任何變更"});
                }
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        [HttpGet]
        public IActionResult AddCategoryByJson()
        {
            
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddCategoryByJson(AddCategoryByJsonInput input)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            // 檢查權限
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if(userInfo.roleStatus && userInfo.deptStatus)
            {
                if (input?.categoryWithpipeline == null || input.categoryWithpipeline.Length == 0)
                {
                    ModelState.AddModelError("categoryWithpipeline", "請上傳有效的 JSON 檔案。");
                    return BadRequest("請上傳有效的 JSON 檔案。");
                }

                using (var stream = input.categoryWithpipeline.OpenReadStream())
                using (var reader = new StreamReader(stream, Encoding.UTF8))
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
                        _logger.LogInformation($"已從JSON檔案新增 {result.categoryCount} 筆類別及 {result.pipelineCount} 筆管線資料到資料庫");
                        return Ok($"上傳{result.categoryCount}筆類別, {result.pipelineCount}筆項目");
                    }
                    else if (result.categoryCount == -1 && result.pipelineCount == -1)
                    {
                        _logger.LogError("處理JSON檔案時發生錯誤，所有變更已被捨棄。");
                        ModelState.AddModelError("categoryWithpipeline", "發生錯誤，所有變更已被捨棄。");
                        return Json(new { success = false, message = ModelState });
                    }
                    else
                    {
                        _logger.LogInformation("未對資料庫進行任何變更");
                        return Json(new { success = false, message = "沒有輸入資料" });
                    }
                }
            }
            else
            {
                return Json(new { success = false, message = "該使用者身分或部門遭到限制" });
            }
        }

        [HttpGet]
        public IActionResult AddRoadProject()
        {
            return View();
        }

        [HttpGet]
        public IActionResult AddRoadProjectByExcel()
        {
            return View();
        }

        [HttpGet]
        public IActionResult ExpansionRangeMap()
        {
            return View();
        }

        [HttpGet]
        public IActionResult StreetViewPhotoMap()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddRoadProject([FromForm] AddRoadProjectInput input)
        {
            var rowsAffected = await _adminInterface.AddRoadProjectAsync(input);

            if (rowsAffected > 0)
            {
                _logger.LogInformation($"已新增 {rowsAffected} 筆專案資料到資料庫");
                return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆專案資料到資料庫" });
            }
            else
            {
                _logger.LogInformation("未對資料庫進行任何變更");
                return BadRequest("未對資料庫進行任何變更");
            }
        }

        [HttpPost]
        public async Task<IActionResult> AddRoadProjectByExcel(AddRoadProjectByExcelInput roadProjectByExcel)
        {
            try
            {
                var rowsAffected = await _adminInterface.AddRoadProjectByExcelAsync(roadProjectByExcel);

                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已新增 {rowsAffected} 筆專案資料到資料庫");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆專案資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return BadRequest(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("An error occurred while adding records." + ex.Message);
                return StatusCode(500, new { success = false, message = "An error occurred while adding records." + ex.Message });
            }
        }

        [HttpGet]
        public IActionResult AddConstructionNotice()
        {
            return View();
        }

        [HttpGet]
        public IActionResult AddConstructNoticeByExcel()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddConstructNoticeByExcel(AddConstructNoticeByExcelInput ConstructNoticeByExcel)
        {
            try
            {
                var rowsAffected = await _adminInterface.AddConstructNoticeByExcelAsync(ConstructNoticeByExcel);

                if (rowsAffected > 0)
                {
                    _logger.LogInformation($"已新增 {rowsAffected} 筆專案資料到資料庫");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆專案資料到資料庫" });
                }
                else
                {
                    _logger.LogInformation("未對資料庫進行任何變更");
                    return BadRequest(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("An error occurred while adding records." + ex.Message);
                return StatusCode(500, new { success = false, message = "An error occurred while adding records." + ex.Message });
            }
        }
    }
}