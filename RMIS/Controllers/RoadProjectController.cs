using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RMIS.Data;
using RMIS.Helpers;
using RMIS.Models;
using RMIS.Models.Admin;
using RMIS.Models.API;
using RMIS.Models.Auth;
using RMIS.Models.sql;
using RMIS.Repositories;
using static RMIS.Models.Map.RoadProject;

namespace RMIS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoadProjectController : ControllerBase
    {
        private readonly RoadProjectInterface _roadProjectInterface;
        private readonly AdminInterface _adminInterface;
        private readonly AccountInterface _accountInterface;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly MapDBContext _mapDBContext;
        private readonly FilePathSettings _filePaths;
        private readonly ILogger<RoadProjectController> _logger;

        private static readonly Dictionary<int, string> StageNames = new()
        {
            { 1, "前期規劃" },
            { 2, "用地取得" },
            { 3, "設計與施工" }
        };

        public RoadProjectController(
            RoadProjectInterface roadProjectInterface,
            AdminInterface adminInterface,
            AccountInterface accountInterface,
            UserManager<ApplicationUser> userManager,
            MapDBContext mapDBContext,
            IOptions<FilePathSettings> filePaths,
            ILogger<RoadProjectController> logger)
        {
            _roadProjectInterface = roadProjectInterface;
            _adminInterface = adminInterface;
            _accountInterface = accountInterface;
            _userManager = userManager;
            _mapDBContext = mapDBContext;
            _filePaths = filePaths.Value;
            _logger = logger;
        }

        private void LogOp(string operation, bool isSuccess, string reason = "", Exception exception = null)
        {
            _logger.LogOperation(operation, isSuccess, reason, User.Identity?.Name, HttpContext.GetClientIpAddress(), exception);
        }

        private static string StageReason(string projectId, int stage) =>
            $"專案 {projectId} 階段{stage}({StageNames[stage]})";

        /// <summary>
        /// 根據專案 ID 取得單一道路專案詳細資料
        /// </summary>
        /// <param name="projectId">專案 ID (ProjectId 或 Guid Id)</param>
        [HttpGet("GetProject/{projectId}")]
        public async Task<IActionResult> GetProject(string projectId)
        {
            // 嘗試以 ProjectId 查詢
            var project = await _mapDBContext.RoadProjects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            // 如果找不到，嘗試以 Guid Id 查詢
            if (project == null && Guid.TryParse(projectId, out Guid guidId))
            {
                project = await _mapDBContext.RoadProjects
                    .FirstOrDefaultAsync(p => p.Id == guidId);
            }

            if (project == null)
            {
                return NotFound(new { success = false, message = $"找不到專案 ID: {projectId}" });
            }

            return Ok(project);
        }

        /// <summary>
        /// 新增道路專案
        /// </summary>
        [HttpPost("AddProject")]
        public async Task<IActionResult> AddProject([FromBody] RoadProject project)
        {
            if (project == null)
            {
                return BadRequest(new { success = false, message = "接收不到資料" });
            }

            try
            {
                // 設定 ID 和建立時間
                project.Id = Guid.NewGuid();
                project.CreateTime = DateTime.Now;

                // 設定 Index (取得最大值 + 1)
                var maxIndex = await _mapDBContext.RoadProjects.MaxAsync(r => (int?)r.Index) ?? 0;
                project.Index = maxIndex + 1;

                // 如果沒有提供 ProjectId，自動產生
                if (string.IsNullOrEmpty(project.ProjectId))
                {
                    project.ProjectId = $"RP{DateTime.Now:yyyyMMddHHmmss}";
                }

                // 自動組合起訖位置
                if (string.IsNullOrEmpty(project.StartEndLocation) && !string.IsNullOrEmpty(project.StartPoint))
                {
                    project.StartEndLocation = string.IsNullOrEmpty(project.EndPoint)
                        ? project.StartPoint
                        : $"{project.StartPoint}至{project.EndPoint}";
                }

                // 設定預設備註
                if (string.IsNullOrEmpty(project.Remarks))
                {
                    project.Remarks = "無";
                }

                // 設定預設的 Guid
                if (project.PlannedExpansionId == Guid.Empty)
                {
                    project.PlannedExpansionId = Guid.NewGuid();
                }
                if (project.StreetViewId == Guid.Empty)
                {
                    project.StreetViewId = Guid.NewGuid();
                }

                await _mapDBContext.RoadProjects.AddAsync(project);
                await _mapDBContext.SaveChangesAsync();

                return Ok(new { success = true, projectId = project.ProjectId, id = project.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"新增失敗：{ex.Message}" });
            }
        }

        /// <summary>
        /// 依篩選條件取得 RoadProjects 查詢
        /// </summary>
        private IQueryable<RoadProject> ApplyDashboardFilter(string district, string year, string budget)
        {
            var query = _mapDBContext.RoadProjects.AsQueryable();

            if (!string.IsNullOrEmpty(district))
                query = query.Where(p => p.AdministrativeDistrict == district);

            if (!string.IsNullOrEmpty(year))
                query = query.Where(p => p.ReviewYear == year);

            if (!string.IsNullOrEmpty(budget))
            {
                if (budget == "1000")
                    query = query.Where(p => p.TotalBudget < 1000);
                else if (budget == "1000-5000")
                    query = query.Where(p => p.TotalBudget >= 1000 && p.TotalBudget <= 5000);
                else if (budget == "5000")
                    query = query.Where(p => p.TotalBudget > 5000);
            }

            return query;
        }

        [HttpGet("GetDashboardKPI")]
        public async Task<IActionResult> GetDashboardKPI(string district = "", string year = "", string budget = "")
        {
            var query = ApplyDashboardFilter(district, year, budget);
            var now = DateTime.Now;
            var firstDayOfMonth = new DateTime(now.Year, now.Month, 1);

            var totalCount = await query.CountAsync();
            var lastMonthCount = await query
                .Where(p => p.CreateTime < firstDayOfMonth)
                .CountAsync();
            var monthDiff = totalCount - lastMonthCount;

            var totalBudgetWan = await query.SumAsync(p => (long)p.TotalBudget);
            var totalBudgetYi = Math.Round(totalBudgetWan / 10000.0, 2);

            return Ok(new
            {
                totalCount,
                monthDiff,
                totalBudget = totalBudgetYi
            });
        }

        [HttpGet("GetStatusRatio")]
        public async Task<IActionResult> GetStatusRatio(string district = "", string year = "", string budget = "")
        {
            var query = ApplyDashboardFilter(district, year, budget);
            var total = await query.CountAsync();
            if (total == 0)
                return Ok(new { labels = new string[0], data = new double[0], colors = new string[0] });

            var stepMap = new Dictionary<string, string>
            {
                { "1", "前期規劃" }, { "2", "用地取得" }, { "3", "設計與施工" }
            };
            var colorMap = new Dictionary<string, string>
            {
                { "1", "#3b82f6" }, { "2", "#ef4444" }, { "3", "#22c55e" }
            };

            var groups = await query
                .GroupBy(p => p.step)
                .Select(g => new { step = g.Key, count = g.Count() })
                .ToListAsync();

            var labels = groups.Select(g => stepMap.ContainsKey(g.step) ? stepMap[g.step] : $"階段 {g.step}").ToArray();
            var data = groups.Select(g => Math.Round(g.count * 100.0 / total, 1)).ToArray();
            var colors = groups.Select(g => colorMap.ContainsKey(g.step) ? colorMap[g.step] : "#94a3b8").ToArray();

            return Ok(new { labels, data, colors });
        }

        [HttpGet("GetDistrictCount")]
        public async Task<IActionResult> GetDistrictCount(string district = "", string year = "", string budget = "")
        {
            var query = ApplyDashboardFilter(district, year, budget);
            var data = await query
                .Where(p => p.AdministrativeDistrict != null && p.AdministrativeDistrict != "")
                .GroupBy(p => p.AdministrativeDistrict)
                .Select(g => new { label = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToListAsync();

            return Ok(new
            {
                labels = data.Select(x => x.label).ToArray(),
                data = data.Select(x => x.count).ToArray()
            });
        }

        [HttpGet("GetBudgetAllocation")]
        public async Task<IActionResult> GetBudgetAllocation(string district = "", string year = "", string budget = "")
        {
            var query = ApplyDashboardFilter(district, year, budget);
            var construction = await query.SumAsync(p => (long)p.ConstructionBudget);
            var land = await query.SumAsync(p => (long)p.LandAcquisitionBudget);
            var compensation = await query.SumAsync(p => (long)p.CompensationBudget);
            var total = construction + land + compensation;

            return Ok(new
            {
                labels = new[] { "工程費", "用地費", "補償費" },
                data = total > 0
                    ? new[] {
                        Math.Round(construction * 100.0 / total, 1),
                        Math.Round(land * 100.0 / total, 1),
                        Math.Round(compensation * 100.0 / total, 1)
                    }
                    : new[] { 0.0, 0.0, 0.0 }
            });
        }

        /// <summary>
        /// 取得最新的道路專案列表
        /// </summary>
        /// <param name="count">取得筆數，預設 5 筆</param>
        [HttpGet("GetLatestProjects")]
        public async Task<IActionResult> GetLatestProjects(int count = 5)
        {
            var projects = await _mapDBContext.RoadProjects
                .OrderByDescending(p => p.CreateTime)
                .Take(count)
                .Select(p => new
                {
                    p.ProjectId,
                    ProjectName = p.StartEndLocation ?? $"{p.StartPoint} - {p.EndPoint}",
                    p.step,
                    p.CreateTime,
                    p.AdministrativeDistrict
                })
                .ToListAsync();

            return Ok(projects);
        }

        [HttpPost("AddProcess1")]
        public async Task<IActionResult> AddProcess1(RoadProjectProcess1 process1)
        {
            if (process1 == null) return BadRequest(new { success = false, message = "接收不到資料" });

            process1.Id = 0;
            var result = await _roadProjectInterface.AddProcess1Async(process1);

            if (result == "success")
            {
                await AddProcessEditLog(process1.ProcessId, "建立");
                LogOp("新增歷程", true, StageReason(process1.ProjectId, 1));
                return Ok(new { success = true, processId = process1.ProcessId });
            }
            LogOp("新增歷程", false, $"{StageReason(process1.ProjectId, 1)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPost("AddProcess2")]
        public async Task<IActionResult> AddProcess2(RoadProjectProcess2 process2)
        {
            if (process2 == null) return BadRequest(new { success = false, message = "接收不到資料" });

            process2.Id = 0;
            var result = await _roadProjectInterface.AddProcess2Async(process2);

            if (result == "success")
            {
                await AddProcessEditLog(process2.ProcessId, "建立");
                LogOp("新增歷程", true, StageReason(process2.ProjectId, 2));
                return Ok(new { success = true, processId = process2.ProcessId });
            }
            LogOp("新增歷程", false, $"{StageReason(process2.ProjectId, 2)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPost("AddProcess3")]
        public async Task<IActionResult> AddProcess3(RoadProjectProcess3 process3)
        {
            if (process3 == null) return BadRequest(new { success = false, message = "接收不到資料" });

            process3.Id = 0;
            var result = await _roadProjectInterface.AddProcess3Async(process3);

            if (result == "success")
            {
                await AddProcessEditLog(process3.ProcessId, "建立");
                LogOp("新增歷程", true, StageReason(process3.ProjectId, 3));
                return Ok(new { success = true, processId = process3.ProcessId });
            }
            LogOp("新增歷程", false, $"{StageReason(process3.ProjectId, 3)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpGet("GetProcess1/{id}")]
        public async Task<ActionResult<RoadProjectProcess1>> GetProcess1(int id)
        {
            var result = await _roadProjectInterface.GetProcess1ByIdAsync(id);
            if (result == null)
            {
                return NotFound($"找不到 ID 為 {id} 的 Process1 資料");
            }
            return Ok(result);
        }

        [HttpGet("GetProcess2/{id}")]
        public async Task<ActionResult<RoadProjectProcess2>> GetProcess2(int id)
        {
            var result = await _roadProjectInterface.GetProcess2ByIdAsync(id);
            if (result == null)
            {
                return NotFound($"找不到 ID 為 {id} 的 Process2 資料");
            }
            return Ok(result);
        }

        [HttpGet("GetProcess3/{id}")]
        public async Task<ActionResult<RoadProjectProcess3>> GetProcess3(int id)
        {
            var result = await _roadProjectInterface.GetProcess3ByIdAsync(id);
            if (result == null)
            {
                return NotFound($"找不到 ID 為 {id} 的 Process3 資料");
            }
            return Ok(result);
        }

        [HttpGet("GetProcessRecords/{projectId}")]
        public async Task<ProjectProcessesList> GetProcessRecords(string projectId)
        {
            var result = await _roadProjectInterface.GetProcessRecordsAsync(projectId);

            return result;
        }

        [HttpPost("UploadProcessFile")]
        public async Task<IActionResult> UploadProcessFile([FromForm] Guid processId, [FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("未收到檔案");
            }

            try
            {
                // 讀取檔案內容轉為 Base64
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var base64String = Convert.ToBase64String(memoryStream.ToArray());

                // 取得檔案類型
                var fileExtension = Path.GetExtension(file.FileName)?.TrimStart('.').ToLower() ?? "";

                // 格式化檔案大小
                var fileSize = FormatFileSize(file.Length);

                // 取得當前使用者
                var uploadUser = User.Identity?.Name ?? "Unknown";

                var processFile = new RoadProjectProcessFile
                {
                    ProcessId = processId,
                    FileName = file.FileName,
                    FileType = fileExtension,
                    Base64String = base64String,
                    FileSize = fileSize,
                    UploadUser = uploadUser
                };

                var result = await _roadProjectInterface.AddProcessFileAsync(processFile);

                if (result == "success")
                {
                    return Ok(new { success = true, message = "檔案上傳成功" });
                }
                else
                {
                    return BadRequest(new { success = false, message = result });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"上傳失敗：{ex.Message}" });
            }
        }

        [HttpPost("UploadProcessFiles")]
        public async Task<IActionResult> UploadProcessFiles([FromForm] Guid processId, [FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest("未收到檔案");
            }

            var results = new List<object>();
            var uploadUser = User.Identity?.Name ?? "Unknown";

            foreach (var file in files)
            {
                try
                {
                    using var memoryStream = new MemoryStream();
                    await file.CopyToAsync(memoryStream);
                    var base64String = Convert.ToBase64String(memoryStream.ToArray());

                    var fileExtension = Path.GetExtension(file.FileName)?.TrimStart('.').ToLower() ?? "";
                    var fileSize = FormatFileSize(file.Length);

                    var processFile = new RoadProjectProcessFile
                    {
                        ProcessId = processId,
                        FileName = file.FileName,
                        FileType = fileExtension,
                        Base64String = base64String,
                        FileSize = fileSize,
                        UploadUser = uploadUser
                    };

                    var result = await _roadProjectInterface.AddProcessFileAsync(processFile);
                    results.Add(new { fileName = file.FileName, success = result == "success", message = result });
                }
                catch (Exception ex)
                {
                    results.Add(new { fileName = file.FileName, success = false, message = ex.Message });
                }
            }

            return Ok(new { success = true, results });
        }

        [HttpGet("GetProcessFiles/{processId}")]
        public async Task<IActionResult> GetProcessFiles(Guid processId)
        {
            var files = await _roadProjectInterface.GetProcessFilesByProcessIdAsync(processId);

            // 回傳時不包含 Base64 內容，只回傳檔案資訊
            var fileInfoList = files.Select(f => new
            {
                f.Id,
                f.ProcessId,
                f.FileName,
                f.FileType,
                f.FileSize,
                f.UploadUser
            }).ToList();

            return Ok(fileInfoList);
        }

        [HttpGet("DownloadProcessFile/{fileId}")]
        public async Task<IActionResult> DownloadProcessFile(int fileId)
        {
            var file = await _roadProjectInterface.GetProcessFileByIdAsync(fileId);

            if (file == null)
            {
                return NotFound("找不到檔案");
            }

            try
            {
                // 從實體路徑讀取檔案: {ProcessFile}/{ProjectId}/{Step}/{OrderIndex}/{FileName}
                var filePath = await _roadProjectInterface.GetProcessFilePathAsync(file.ProcessId, file.FileName);

                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("檔案不存在於伺服器");
                }

                var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
                var contentType = GetContentType(file.FileType);
                return File(bytes, contentType, file.FileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"下載失敗：{ex.Message}");
            }
        }

        [HttpDelete("DeleteProcessFile/{fileId}")]
        public async Task<IActionResult> DeleteProcessFile(int fileId)
        {
            var result = await _roadProjectInterface.DeleteProcessFileAsync(fileId);

            if (result == "success")
            {
                return Ok(new { success = true, message = "檔案刪除成功" });
            }

            return BadRequest(new { success = false, message = result });
        }

        [HttpDelete("DeleteProcess1/{id}")]
        public async Task<IActionResult> DeleteProcess1(int id)
        {
            var record = await _mapDBContext.RoadProjectProcess1.FindAsync(id);
            var result = await _roadProjectInterface.DeleteProcess1Async(id);

            if (result == "success")
            {
                LogOp("刪除歷程", true, StageReason(record?.ProjectId ?? "?", 1));
                return Ok(new { success = true, message = "紀錄刪除成功" });
            }
            LogOp("刪除歷程", false, $"{StageReason(record?.ProjectId ?? "?", 1)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpDelete("DeleteProcess2/{id}")]
        public async Task<IActionResult> DeleteProcess2(int id)
        {
            var record = await _mapDBContext.RoadProjectProcess2.FindAsync(id);
            var result = await _roadProjectInterface.DeleteProcess2Async(id);

            if (result == "success")
            {
                LogOp("刪除歷程", true, StageReason(record?.ProjectId ?? "?", 2));
                return Ok(new { success = true, message = "紀錄刪除成功" });
            }
            LogOp("刪除歷程", false, $"{StageReason(record?.ProjectId ?? "?", 2)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpDelete("DeleteProcess3/{id}")]
        public async Task<IActionResult> DeleteProcess3(int id)
        {
            var record = await _mapDBContext.RoadProjectProcess3.FindAsync(id);
            var result = await _roadProjectInterface.DeleteProcess3Async(id);

            if (result == "success")
            {
                LogOp("刪除歷程", true, StageReason(record?.ProjectId ?? "?", 3));
                return Ok(new { success = true, message = "紀錄刪除成功" });
            }
            LogOp("刪除歷程", false, $"{StageReason(record?.ProjectId ?? "?", 3)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateProcess1")]
        public async Task<IActionResult> UpdateProcess1([FromBody] RoadProjectProcess1 process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateProcess1Async(process);

            if (result == "success")
            {
                await AddProcessEditLog(process.ProcessId, "編輯");
                LogOp("編輯歷程", true, StageReason(process.ProjectId, 1));
                return Ok(new { success = true, processId = process.ProcessId });
            }
            LogOp("編輯歷程", false, $"{StageReason(process.ProjectId, 1)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateProcess2")]
        public async Task<IActionResult> UpdateProcess2([FromBody] RoadProjectProcess2 process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateProcess2Async(process);

            if (result == "success")
            {
                await AddProcessEditLog(process.ProcessId, "編輯");
                LogOp("編輯歷程", true, StageReason(process.ProjectId, 2));
                return Ok(new { success = true, processId = process.ProcessId });
            }
            LogOp("編輯歷程", false, $"{StageReason(process.ProjectId, 2)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateProcess3")]
        public async Task<IActionResult> UpdateProcess3([FromBody] RoadProjectProcess3 process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateProcess3Async(process);

            if (result == "success")
            {
                await AddProcessEditLog(process.ProcessId, "編輯");
                LogOp("編輯歷程", true, StageReason(process.ProjectId, 3));
                return Ok(new { success = true, processId = process.ProcessId });
            }
            LogOp("編輯歷程", false, $"{StageReason(process.ProjectId, 3)}，{result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpGet("GetProcessEditLogs/{processId}")]
        public async Task<IActionResult> GetProcessEditLogs(Guid processId)
        {
            var logs = await _mapDBContext.ProcessEditLogs
                .Where(l => l.ProcessId == processId)
                .OrderBy(l => l.RecordTime)
                .Select(l => new { l.Id, l.ProcessId, l.RecordTime, l.OperationType })
                .ToListAsync();
            return Ok(logs);
        }

        private async Task AddProcessEditLog(Guid processId, string operationType)
        {
            _mapDBContext.ProcessEditLogs.Add(new ProcessEditLog
            {
                ProcessId = processId,
                RecordTime = DateTime.Now,
                OperationType = operationType
            });
            await _mapDBContext.SaveChangesAsync();
        }

        private string GetContentType(string fileType)
        {
            var contentTypes = new Dictionary<string, string>
            {
                { "pdf", "application/pdf" },
                { "doc", "application/msword" },
                { "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
                { "xls", "application/vnd.ms-excel" },
                { "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
                { "ppt", "application/vnd.ms-powerpoint" },
                { "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
                { "jpg", "image/jpeg" },
                { "jpeg", "image/jpeg" },
                { "png", "image/png" },
                { "gif", "image/gif" },
                { "zip", "application/zip" },
                { "rar", "application/x-rar-compressed" }
            };

            return contentTypes.TryGetValue(fileType?.ToLower() ?? "", out var type)
                ? type
                : "application/octet-stream";
        }

        private string FormatFileSize(long bytes)
        {
            if (bytes == 0) return "0 Bytes";
            string[] sizes = { "Bytes", "KB", "MB", "GB" };
            int i = (int)Math.Floor(Math.Log(bytes) / Math.Log(1024));
            return Math.Round(bytes / Math.Pow(1024, i), 2) + " " + sizes[i];
        }

        // ===== 從 AdminAPI 轉移的道路專案相關 API =====

        [HttpPost("updateProjectData")]
        public async Task<IActionResult> UpdateProjectData([FromForm] UpdateProjectInput projectData)
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "專案查詢");

                if (!currentUserPermission.Update)
                {
                    return Ok(new { success = false, message = "無權限更新資料" });
                }
                var updated = await _adminInterface.UpdateProjectDataAsync(projectData);
                if (updated)
                {
                    return Ok(new { success = true, message = "資料已更新" });
                }
                else
                {
                    return BadRequest(new { success = false, message = "資料未更新" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("getPoints/{projectId}")]
        public async Task<IActionResult> GetPoints(Guid projectId)
        {
            var result = await _adminInterface.GetPointsByProjectIdAsync(projectId);
            return Ok(result);
        }

        [HttpPost("confirmCoordinate/{projectId}")]
        public async Task<IActionResult> ConfirmCoordinate(Guid projectId)
        {
            try
            {
                var result = await _adminInterface.ConfirmCoordinateAsync(projectId);
                if (result)
                    return Ok(new { success = true, message = "座標已確認" });
                return BadRequest(new { success = false, message = "找不到指定的專案" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("updatePoints")]
        public async Task<IActionResult> UpdatePoints([FromForm] UpdatePointsInput input)
        {
            try
            {
                var result = await _adminInterface.UpdateProjectPointsAsync(input.ProjectId, input.RangePoints, input.PhotoPoints);
                if (result)
                {
                    return Ok(new { success = true, message = "座標點已更新" });
                }
                return BadRequest(new { success = false, message = "找不到指定的專案" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("updateProjectPhoto")]
        public async Task<IActionResult> UpdateProjectPhoto([FromForm] UpdateProjectPhotoInput projectPhoto)
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "專案查詢");

                if (!currentUserPermission.Update)
                {
                    return Ok(new { success = false, message = "無權限更新照片" });
                }
                var updated = await _adminInterface.UpdateProjectPhotoAsync(projectPhoto);
                if (updated)
                {
                    return Ok(new { success = true, message = "照片已更新" });
                }
                else
                {
                    return BadRequest(new { success = false, message = "照片更新失敗" });
                }
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "照片未更新" });
            }
        }
    }
}
