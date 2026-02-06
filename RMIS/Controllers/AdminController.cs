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
                        return  Json(new { success = true, message = $"上傳{result.categoryCount}筆類別, {result.pipelineCount}筆項目" });
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
        public IActionResult ImportRoadProjectByExcel()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ImportRoadProjectByExcel([FromForm] ImportRoadProjectByExcelInput input)
        {
            try
            {
                var result = await _adminInterface.ImportRoadProjectByExcelAsync(input);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excel 匯入道路專案失敗");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult DownloadImportTemplate()
        {
            // 建立範本 Excel
            using var package = new OfficeOpenXml.ExcelPackage();
            var ws = package.Workbook.Worksheets.Add("道路專案範本");

            // 設定標題列
            string[] headers = { "專案編號", "申請人", "行政區", "階段", "起點", "終點", "起訖位置",
                "道路長度", "現況路寬", "計畫路寬", "公有土地", "私有土地", "公私土地",
                "工程經費", "用地經費", "補償經費", "總經費", "備註", "審查年度", "案件類型",
                "專案名稱", "RC數量", "鐵皮屋數量", "審查結果", "拓寬範圍座標", "街景照片座標" };

            for (int i = 0; i < headers.Length; i++)
            {
                ws.Cells[1, i + 1].Value = headers[i];
                ws.Cells[1, i + 1].Style.Font.Bold = true;
            }

            // 範例資料
            ws.Cells[2, 1].Value = "PROJ001";
            ws.Cells[2, 2].Value = "張三";
            ws.Cells[2, 3].Value = "桃園區";
            ws.Cells[2, 4].Value = "1";
            ws.Cells[2, 5].Value = "中正路100號";
            ws.Cells[2, 6].Value = "中正路200號";
            ws.Cells[2, 7].Value = "中正路100號~200號";
            ws.Cells[2, 8].Value = "500";
            ws.Cells[2, 9].Value = "8";
            ws.Cells[2, 10].Value = "12";
            ws.Cells[2, 11].Value = "5";
            ws.Cells[2, 12].Value = "3";
            ws.Cells[2, 13].Value = "2";
            ws.Cells[2, 14].Value = "10000000";
            ws.Cells[2, 15].Value = "5000000";
            ws.Cells[2, 16].Value = "3000000";
            ws.Cells[2, 17].Value = "18000000";
            ws.Cells[2, 18].Value = "備註說明";
            ws.Cells[2, 19].Value = "113";
            ws.Cells[2, 20].Value = "一般案件";
            ws.Cells[2, 21].Value = "中正路拓寬工程";
            ws.Cells[2, 22].Value = "2";
            ws.Cells[2, 23].Value = "1";
            ws.Cells[2, 24].Value = "通過";
            ws.Cells[2, 25].Value = "[{\"lat\":24.9936,\"lng\":121.3010},{\"lat\":24.9940,\"lng\":121.3015}]";
            ws.Cells[2, 26].Value = "[{\"lat\":24.9938,\"lng\":121.3012,\"photoName\":\"photo1.jpg\"}]";

            ws.Cells.AutoFitColumns();

            // 建立 ZIP 檔案
            using var memoryStream = new MemoryStream();
            using (var archive = new System.IO.Compression.ZipArchive(memoryStream, System.IO.Compression.ZipArchiveMode.Create, true))
            {
                // 加入 Excel 檔案
                var excelEntry = archive.CreateEntry("道路專案匯入範本.xlsx");
                using (var entryStream = excelEntry.Open())
                {
                    package.SaveAs(entryStream);
                }

                // 加入範例照片目錄說明檔
                var readmeEntry = archive.CreateEntry("PROJ001/README.txt");
                using (var entryStream = readmeEntry.Open())
                using (var writer = new StreamWriter(entryStream, System.Text.Encoding.UTF8))
                {
                    writer.WriteLine("照片壓縮檔目錄結構說明");
                    writer.WriteLine("========================");
                    writer.WriteLine("");
                    writer.WriteLine("目錄結構:");
                    writer.WriteLine("  {專案編號}/");
                    writer.WriteLine("    photo1.jpg");
                    writer.WriteLine("    photo2.jpg");
                    writer.WriteLine("    ...");
                    writer.WriteLine("");
                    writer.WriteLine("範例:");
                    writer.WriteLine("  PROJ001/");
                    writer.WriteLine("    photo1.jpg  <-- 對應 Excel 中街景照片座標的 photoName");
                    writer.WriteLine("    photo2.jpg");
                    writer.WriteLine("");
                    writer.WriteLine("注意事項:");
                    writer.WriteLine("1. 目錄名稱必須與 Excel 中的「專案編號」一致");
                    writer.WriteLine("2. 照片檔名必須與 Excel 中「街景照片座標」欄位的 photoName 一致");
                    writer.WriteLine("3. 支援 jpg、png 等常見圖片格式");
                }

                // 加入一個空白的範例圖片位置說明
                var placeholderEntry = archive.CreateEntry("PROJ001/photo1.jpg.txt");
                using (var entryStream = placeholderEntry.Open())
                using (var writer = new StreamWriter(entryStream, System.Text.Encoding.UTF8))
                {
                    writer.WriteLine("請將此檔案替換為實際的 photo1.jpg 圖片檔案");
                }
            }

            memoryStream.Position = 0;
            return File(memoryStream.ToArray(), "application/zip", "道路專案匯入範本.zip");
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
                var rowsAffected = await _adminInterface.AddRoadProjectAsync(input);

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
                _logger.LogError(ex, "新增道路專案失敗");
                return StatusCode(500, new { success = false, message = ex.Message, innerMessage = ex.InnerException?.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteRoadProject([FromBody] DeleteRoadProjectInput input)
        {
            try
            {
                var result = await _adminInterface.DeleteRoadProjectAsync(input.Id);

                if (result)
                {
                    _logger.LogInformation($"已刪除專案: {input.Id}");
                    return Ok(new { success = true, message = "專案已成功刪除" });
                }
                else
                {
                    return BadRequest(new { success = false, message = "找不到指定的專案" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "刪除道路專案失敗");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateRoadProject([FromBody] UpdateProjectInput input)
        {
            try
            {
                var result = await _adminInterface.UpdateProjectDataAsync(input);
                if (result)
                {
                    _logger.LogInformation($"已更新專案: {input.Id}");
                    return Ok(new { success = true, message = "專案已成功更新" });
                }
                else
                {
                    return BadRequest(new { success = false, message = "找不到指定的專案" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新道路專案失敗");
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