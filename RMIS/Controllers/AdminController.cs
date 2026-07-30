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
using RMIS.Helpers;
using RMIS.Models.Admin;
using RMIS.Models.API;
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
        private readonly IWebHostEnvironment _env;

        public AdminController(AdminInterface adminInterface,
                               AccountInterface accountInterface,
                               UserManager<ApplicationUser> userManager,
                               ILogger<AdminController> logger,
                               IWebHostEnvironment env)
        {
            _adminInterface = adminInterface;
            _accountInterface = accountInterface;
            _userManager = userManager;
            _logger = logger;
            _env = env;
        }

        private void LogOp(string operation, bool isSuccess, string reason = "", Exception exception = null)
        {
            _logger.LogOperation(operation, isSuccess, reason, User.Identity?.Name, HttpContext.GetClientIpAddress(), exception);
        }

        /// <summary>
        /// 檢查目前使用者是否為該道路專案的建立者，只有建立者本人可編輯/刪除。
        /// 回傳 null 表示可以繼續執行，否則回傳應直接回應的 IActionResult。
        /// </summary>
        private async Task<IActionResult?> CheckProjectOwnershipAsync(int roadProjectId)
        {
            var creatorId = await _adminInterface.GetRoadProjectCreatorIdAsync(roadProjectId);

            // 專案不存在，或為新增建立者欄位前的舊資料（沒有記錄建立者）：交由後續流程處理，不在此攔截
            if (creatorId == null)
                return null;

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null || creatorId != currentUser.Id)
                return Ok(new { success = false, message = "僅建立者本人可編輯或刪除此專案" });

            return null;
        }

        [HttpGet]
        public async Task<IActionResult> AddCategory()
        {
            var currentUser = await _userManager.GetUserAsync(User);
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
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                var rowsAffected = await _adminInterface.AddCategoryAsync(input);

                if (rowsAffected > 0)
                {
                    LogOp("新增類別", true, $"已新增 {rowsAffected} 筆類別資料");
                    return Json(new { success = true, message = $"已新增 {rowsAffected} 筆類別資料到資料庫" });
                }
                else
                {
                    LogOp("新增類別", false, "未對資料庫進行任何變更");
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
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);
            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                var input = await _adminInterface.getPipelineInput(userInfo);
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
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                LogOp("新增管線", false, "無權限新增");
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if(userInfo.roleStatus && userInfo.deptStatus)
            {
                var rowsAffected = await _adminInterface.AddPipelineAsync(input);

                if (rowsAffected > 0)
                {
                    LogOp("新增管線", true, $"已新增 {rowsAffected} 筆管線資料");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆管線資料到資料庫" });
                }
                else
                {
                    LogOp("新增管線", false, "未對資料庫進行任何變更");
                    return Json(new { success = false, message = "未對資料庫進行任何變更" });
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
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }

            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                var rowsAffected = await _adminInterface.AddRoadAsync(input);

                if (rowsAffected > 0)
                {
                    LogOp("新增道路", true, $"已新增 {rowsAffected} 筆道路資料");
                    return Ok(new { success = true, message = $"已從CSV新增 {rowsAffected} 筆道路資料到資料庫" });
                }
                else
                {
                    LogOp("新增道路", false, "未對資料庫進行任何變更");
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
            var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "業務圖資");

            if (!currentUserPermission.Create)
            {
                return Json(new { success = false, message = "無權限新增" });
            }
            var userInfo = await _accountInterface.GetUserAuthInfo(currentUser);

            if (userInfo.roleStatus && userInfo.deptStatus)
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }
                var rowsAffected = await _adminInterface.AddRoadByCSVAsync(input);

                if (rowsAffected > 0)
                {
                    LogOp("新增道路(CSV)", true, $"已新增 {rowsAffected} 筆道路資料");
                    return Json(new { success = true, message = $"已新增 {rowsAffected} 筆類別資料到資料庫" });
                }
                else
                {
                    LogOp("新增道路(CSV)", false, "未對資料庫進行任何變更");
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
                    LogOp("新增地圖來源", true, $"已新增 {rowsAffected} 筆地圖來源資料");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆地圖來源資料到資料庫" });
                }
                else
                {
                    LogOp("新增地圖來源", false, "未對資料庫進行任何變更");
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
                        LogOp("新增類別(JSON)", true, $"已新增 {result.categoryCount} 筆類別及 {result.pipelineCount} 筆管線資料");
                        return Json(new { success = true, message = $"上傳{result.categoryCount}筆類別, {result.pipelineCount}筆項目" });
                    }
                    else if (result.categoryCount == -1 && result.pipelineCount == -1)
                    {
                        LogOp("新增類別(JSON)", false, "處理JSON檔案時發生錯誤，所有變更已被捨棄");
                        ModelState.AddModelError("categoryWithpipeline", "發生錯誤，所有變更已被捨棄。");
                        return Json(new { success = false, message = ModelState });
                    }
                    else
                    {
                        LogOp("新增類別(JSON)", false, "未對資料庫進行任何變更");
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
        public IActionResult ImportRoadProjectByExcel()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ImportRoadProjectByExcel([FromForm] ImportRoadProjectByExcelInput input)
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                var result = await _adminInterface.ImportRoadProjectByExcelAsync(input, currentUser?.Id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                LogOp("匯入道路專案(Excel)", false, ex.Message, ex);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult DownloadImportTemplate()
        {
            var path = Path.Combine(_env.ContentRootPath, "Sample", "道路專案匯入範本.zip");
            return PhysicalFile(path, "application/zip", "道路專案匯入範本.zip");
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
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                var rowsAffected = await _adminInterface.AddRoadProjectAsync(input, currentUser?.Id);

                if (rowsAffected > 0)
                {
                    LogOp("新增道路專案", true, $"已新增 {rowsAffected} 筆專案資料");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆專案資料到資料庫" });
                }
                else
                {
                    LogOp("新增道路專案", false, "未對資料庫進行任何變更");
                    return BadRequest(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            catch (Exception ex)
            {
                LogOp("新增道路專案", false, ex.Message, ex);
                return StatusCode(500, new { success = false, message = ex.Message, innerMessage = ex.InnerException?.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteRoadProject([FromBody] DeleteRoadProjectInput input)
        {
            try
            {
                var ownershipError = await CheckProjectOwnershipAsync(input.Id);
                if (ownershipError != null) return ownershipError;

                var (success, projectName) = await _adminInterface.DeleteRoadProjectAsync(input.Id);

                if (success)
                {
                    LogOp("刪除道路專案", true, $"已刪除專案: {projectName}");
                    return Ok(new { success = true, message = "專案已成功刪除" });
                }
                else
                {
                    LogOp("刪除道路專案", false, $"找不到指定的專案: {input.ProjectId}");
                    return BadRequest(new { success = false, message = "找不到指定的專案" });
                }
            }
            catch (Exception ex)
            {
                LogOp("刪除道路專案", false, ex.Message, ex);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateRoadProject([FromBody] UpdateProjectInput input)
        {
            try
            {
                var ownershipError = await CheckProjectOwnershipAsync(input.Id);
                if (ownershipError != null) return ownershipError;

                var (success, projectName) = await _adminInterface.UpdateProjectDataAsync(input);
                if (success)
                {
                    LogOp("更新道路專案", true, $"已更新專案: {projectName}");
                    return Ok(new { success = true, message = "專案已成功更新" });
                }
                else
                {
                    LogOp("更新道路專案", false, $"找不到指定的專案: {input.ProjectId}");
                    return BadRequest(new { success = false, message = "找不到指定的專案" });
                }
            }
            catch (Exception ex)
            {
                LogOp("更新道路專案", false, ex.Message, ex);
                return StatusCode(500, new { success = false, message = ex.Message });
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
                    LogOp("匯入施工通告(Excel)", true, $"已新增 {rowsAffected} 筆施工通告資料");
                    return Ok(new { success = true, message = $"已新增 {rowsAffected} 筆專案資料到資料庫" });
                }
                else
                {
                    LogOp("匯入施工通告(Excel)", false, "未對資料庫進行任何變更");
                    return BadRequest(new { success = false, message = "未對資料庫進行任何變更" });
                }
            }
            catch (Exception ex)
            {
                LogOp("匯入施工通告(Excel)", false, ex.Message, ex);
                return StatusCode(500, new { success = false, message = "An error occurred while adding records." + ex.Message });
            }
        }
    }
}
