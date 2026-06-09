using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
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
using A = DocumentFormat.OpenXml.Drawing;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;

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
            // 嘗試以 ProjectId 查詢，再以 int Id 查詢
            var project = await _mapDBContext.RoadProjects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null && int.TryParse(projectId, out int intId))
                project = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(p => p.Id == intId);

            if (project == null)
            {
                return NotFound(new { success = false, message = $"找不到專案 ID: {projectId}" });
            }

            return Ok(project);
        }

        [HttpPost("UpdateProgress")]
        public async Task<IActionResult> UpdateProgress([FromBody] UpdateProgressInput input)
        {
            var project = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(p => p.ProjectId == input.ProjectId);
            if (project == null && int.TryParse(input.ProjectId, out int g))
                project = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(p => p.Id == g);
            if (project == null)
                return NotFound(new { success = false, message = $"找不到專案 ID: {input.ProjectId}" });

            project.Progress = Math.Clamp(input.Progress, 0, 100);
            await _mapDBContext.SaveChangesAsync();
            return Ok(new { success = true, progress = project.Progress });
        }

        public class UpdateProgressInput { public string ProjectId { get; set; } public int Progress { get; set; } }

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
                project.CreateTime = DateTime.Now;

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

            // 道路總長度（RoadLength 為字串、單位公尺，需載入後解析加總再轉 km）
            var roadLengths = await query.Select(p => p.RoadLength).ToListAsync();
            var totalLengthM = roadLengths
                .Where(l => !string.IsNullOrEmpty(l))
                .Sum(l => double.TryParse(l, out var v) ? v : 0);
            var totalLengthKm = Math.Round(totalLengthM / 1000.0, 2);

            // 工程發包費（ConstructionBudget，單位萬元 → 億元）
            var contractAmountWan = await query.SumAsync(p => (long)p.ConstructionBudget);
            var contractAmountYi = Math.Round(contractAmountWan / 10000.0, 2);
            var contractPercent = totalBudgetWan > 0
                ? Math.Round(contractAmountWan * 100.0 / totalBudgetWan, 1)
                : 0.0;

            return Ok(new
            {
                totalCount,
                monthDiff,
                totalBudget = totalBudgetYi,
                totalLength = totalLengthKm,
                contractAmount = contractAmountYi,
                contractPercent
            });
        }

        [HttpGet("GetStatusRatio")]
        public async Task<IActionResult> GetStatusRatio(string district = "", string year = "", string budget = "")
        {
            return Ok(new { labels = new string[0], data = new double[0], colors = new string[0] });
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
        public async Task<IActionResult> GetLatestProjects(int count = 5, string district = "", string year = "", string budget = "")
        {
            var projects = await ApplyDashboardFilter(district, year, budget)
                .OrderByDescending(p => p.CreateTime)
                .Take(count)
                .Select(p => new
                {
                    p.ProjectId,
                    ProjectName = p.StartEndLocation ?? $"{p.StartPoint} - {p.EndPoint}",
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

        [HttpGet("GetAllProcessRecords/{projectId}")]
        public async Task<IActionResult> GetAllProcessRecords(string projectId)
        {
            var result = await _roadProjectInterface.GetAllProcessRecordsAsync(projectId);
            return Ok(result);
        }

        [HttpPost("GetLastProcessRecords")]
        public async Task<IActionResult> GetLastProcessRecords([FromBody] List<string> projectIds)
        {
            if (projectIds == null || projectIds.Count == 0)
                return BadRequest(new { success = false, message = "未提供專案 ID" });

            var result = await _roadProjectInterface.GetLastProcessRecordsByProjectIdsAsync(projectIds);
            return Ok(result);
        }

        [HttpPost("AddAllProcessRecord")]
        public async Task<IActionResult> AddAllProcessRecord([FromBody] RoadProjectProcess process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            process.Id = 0;
            var (result, processId) = await _roadProjectInterface.AddAllProcessRecordAsync(process);

            if (result == "success")
            {
                await AddProcessEditLog(processId, "建立");
                LogOp("新增總階段歷程", true, $"專案:{process.ProjectId}");
                return Ok(new { success = true, processId });
            }

            LogOp("新增總階段歷程", false, $"專案:{process.ProjectId}, {result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateAllProcessRecord")]
        public async Task<IActionResult> UpdateAllProcessRecord([FromBody] RoadProjectProcess process)
        {
            if (process == null || process.Id <= 0) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateAllProcessRecordAsync(process);
            if (result == "success")
            {
                var existing = await _mapDBContext.RoadProjectProcesses.FindAsync(process.Id);
                if (existing != null) await AddProcessEditLog(existing.ProcessId, "修改");
                LogOp("更新總階段歷程", true, $"Id:{process.Id}");
                return Ok(new { success = true });
            }

            LogOp("更新總階段歷程", false, $"Id:{process.Id}, {result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpDelete("DeleteAllProcessRecord/{id}")]
        public async Task<IActionResult> DeleteAllProcessRecord(int id)
        {
            var result = await _roadProjectInterface.DeleteAllProcessRecordAsync(id);
            if (result == "success")
            {
                LogOp("刪除總階段歷程", true, $"Id:{id}");
                return Ok(new { success = true, message = "刪除成功" });
            }

            LogOp("刪除總階段歷程", false, $"Id:{id}, {result}");
            return BadRequest(new { success = false, message = result });
        }

        [HttpPost("UploadProcessFile")]
        public async Task<IActionResult> UploadProcessFile([FromForm] string processId, [FromForm] IFormFile file)
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
        public async Task<IActionResult> UploadProcessFiles([FromForm] string processId, [FromForm] List<IFormFile> files)
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
        public async Task<IActionResult> GetProcessFiles(string processId)
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
                return Ok(new { success = true, message = "記錄刪除成功" });
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
                return Ok(new { success = true, message = "記錄刪除成功" });
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
                return Ok(new { success = true, message = "記錄刪除成功" });
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
        public async Task<IActionResult> GetProcessEditLogs(string processId)
        {
            var logs = await _mapDBContext.ProcessEditLogs
                .Where(l => l.ProcessId == processId)
                .OrderBy(l => l.RecordTime)
                .Select(l => new { l.Id, l.ProcessId, l.RecordTime, l.OperationType })
                .ToListAsync();
            return Ok(logs);
        }

        private async Task AddProcessEditLog(string processId, string operationType)
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
        public async Task<IActionResult> GetPoints(int projectId)
        {
            var result = await _adminInterface.GetPointsByProjectIdAsync(projectId);
            return Ok(result);
        }

        [HttpPost("confirmCoordinate/{projectId}")]
        public async Task<IActionResult> ConfirmCoordinate(int projectId)
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

        [HttpPost("ExportSupplementWord")]
        public IActionResult ExportSupplementWord([FromBody] SupplementWordInput input)
        {
            try
            {
                var ms = new MemoryStream();
                BuildSupplementWord(ms, input);
                var fileName = $"局長補充資料_{input.ProjectName}_{DateTime.Now:yyyyMMdd}.docx";
                return File(ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static void BuildSupplementWord(MemoryStream ms, SupplementWordInput input)
        {
            using var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document);
            var mainPart = doc.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            // 粗體標楷體 16pt（標題欄位用）
            static RunProperties BoldKaitiRp() => new(
                new RunFonts { Ascii = "標楷體", EastAsia = "標楷體", ComplexScript = "標楷體" },
                new Bold(),
                new BoldComplexScript(),
                new FontSize { Val = "32" },
                new FontSizeComplexScript { Val = "32" });

            // 一般標楷體 16pt（內容用）
            static RunProperties KaitiRp() => new(
                new RunFonts { Ascii = "標楷體", EastAsia = "標楷體", ComplexScript = "標楷體" },
                new FontSize { Val = "32" },
                new FontSizeComplexScript { Val = "32" });

            // 垂直 KV 表格的 Key 欄（左欄，寬 2547）
            static TableCell DataKeyCell(string text) => new(
                new TableCellProperties(
                    new TableCellWidth { Width = "2547", Type = TableWidthUnitValues.Dxa }),
                new Paragraph(
                    new ParagraphProperties(
                        new SpacingBetweenLines { Line = "520", LineRule = LineSpacingRuleValues.Exact, After = "0" },
                        new Justification { Val = JustificationValues.Both }),
                    new Run(KaitiRp(), new Text(text) { Space = SpaceProcessingModeValues.Preserve })));

            // 垂直 KV 表格的 Value 欄（右欄，寬 6513）
            static TableCell DataValCell(string text) => new(
                new TableCellProperties(
                    new TableCellWidth { Width = "6513", Type = TableWidthUnitValues.Dxa }),
                new Paragraph(
                    new ParagraphProperties(
                        new SpacingBetweenLines { Line = "520", LineRule = LineSpacingRuleValues.Exact, After = "0" },
                        new Justification { Val = JustificationValues.Both }),
                    new Run(KaitiRp(), new Text(text) { Space = SpaceProcessingModeValues.Preserve })));

            // 合併路寬
            string roadWidth;
            if (!string.IsNullOrEmpty(input.CurrentRoadWidth) && !string.IsNullOrEmpty(input.PlannedRoadWidth))
                roadWidth = $"現況{input.CurrentRoadWidth}/計畫{input.PlannedRoadWidth}";
            else
                roadWidth = !string.IsNullOrEmpty(input.CurrentRoadWidth) ? input.CurrentRoadWidth
                          : input.PlannedRoadWidth ?? "";

            // 1. 題目段落（粗體紅色「題目」+ 一般文字內容）
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new PageBreakBefore(),
                    new SpacingBetweenLines { Line = "480", LineRule = LineSpacingRuleValues.Exact, Before = "0", After = "0" }),
                new Run(
                    new RunProperties(
                        new RunFonts { Ascii = "標楷體", EastAsia = "標楷體", ComplexScript = "標楷體" },
                        new Bold(), new BoldComplexScript(),
                        new Color { Val = "FF0000" },
                        new FontSize { Val = "40" }, new FontSizeComplexScript { Val = "40" }),
                    new Text("題目")),
                new Run(BoldKaitiRp(), new Text("：")),
                new Run(KaitiRp(), new Text(input.ProjectName ?? ""))));

            // 2. 報告機關(科室) 段落
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { Line = "480", LineRule = LineSpacingRuleValues.Exact, Before = "0", After = "0" }),
                new Run(BoldKaitiRp(), new Text("報告機關(科室)：")),
                new Run(KaitiRp(), new Text(input.ExecutionUnit ?? ""))));

            // 3. 關心議員 段落
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { Line = "480", LineRule = LineSpacingRuleValues.Exact }),
                new Run(BoldKaitiRp(), new Text("關心議員：")),
                new Run(KaitiRp(), new Text(input.Proposer ?? ""))));

            // 4. 執行現況 標題段落（含浮動橫線，與原始文件一致）
            {
                // 浮動直線用 OpenXmlPartRootElement 外的通用解析方式：
                // DocumentFormat.OpenXml.OpenXmlElement 支援 new Run { InnerXml = "..." }
                // 但 Run.InnerXml 只能設定 run 內部元素，所以用 Paragraph.InnerXml 注入整段
                const string parasXml =
                    "<w:pPr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
                    "<w:spacing w:line=\"480\" w:lineRule=\"exact\"/><w:jc w:val=\"both\"/></w:pPr>" +
                    "<w:r xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
                    "<w:rPr><w:rFonts w:ascii=\"標楷體\" w:eastAsia=\"標楷體\" w:hAnsi=\"標楷體\"/>" +
                    "<w:b/><w:bCs/><w:sz w:val=\"32\"/><w:szCs w:val=\"32\"/></w:rPr>" +
                    "<w:drawing xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" " +
                    "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" " +
                    "xmlns:wps=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\">" +
                    "<wp:anchor distT=\"0\" distB=\"0\" distL=\"114300\" distR=\"114300\" simplePos=\"0\" " +
                    "relativeHeight=\"251659264\" behindDoc=\"0\" locked=\"0\" layoutInCell=\"1\" allowOverlap=\"1\">" +
                    "<wp:simplePos x=\"0\" y=\"0\"/>" +
                    "<wp:positionH relativeFrom=\"column\"><wp:posOffset>13970</wp:posOffset></wp:positionH>" +
                    "<wp:positionV relativeFrom=\"paragraph\"><wp:posOffset>33020</wp:posOffset></wp:positionV>" +
                    "<wp:extent cx=\"5819775\" cy=\"635\"/>" +
                    "<wp:effectExtent l=\"0\" t=\"0\" r=\"28575\" b=\"37465\"/>" +
                    "<wp:wrapNone/><wp:docPr id=\"1\" name=\"AutoShape 4\"/>" +
                    "<wp:cNvGraphicFramePr><a:graphicFrameLocks/></wp:cNvGraphicFramePr>" +
                    "<a:graphic><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\">" +
                    "<wps:wsp><wps:cNvCnPr><a:cxnSpLocks noChangeShapeType=\"1\"/></wps:cNvCnPr>" +
                    "<wps:spPr bwMode=\"auto\">" +
                    "<a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"5819775\" cy=\"635\"/></a:xfrm>" +
                    "<a:prstGeom prst=\"straightConnector1\"><a:avLst/></a:prstGeom><a:noFill/>" +
                    "<a:ln w=\"9525\"><a:solidFill><a:srgbClr val=\"000000\"/></a:solidFill>" +
                    "<a:round/><a:headEnd/><a:tailEnd/></a:ln>" +
                    "</wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>" +
                    "<w:r xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
                    "<w:rPr><w:rFonts w:ascii=\"標楷體\" w:eastAsia=\"標楷體\" w:hAnsi=\"標楷體\"/>" +
                    "<w:b/><w:bCs/><w:sz w:val=\"32\"/><w:szCs w:val=\"32\"/></w:rPr>" +
                    "<w:t>執行現況：</w:t></w:r>";

                var statusPara = new Paragraph();
                statusPara.InnerXml = parasXml;
                body.Append(statusPara);
            }

            // 5. 基本資料垂直 KV 表格：長度、路寬、工程費、用地費、總經費（兩欄垂直排列）
            var dataTable = new Table(new TableProperties(
                new TableStyle { Val = "a9" },
                new TableWidth { Width = "0", Type = TableWidthUnitValues.Auto },
                new TableLook { Val = "04A0", FirstRow = true },
                TableBorders()));

            dataTable.AppendChild(new TableGrid(
                new GridColumn { Width = "2547" },
                new GridColumn { Width = "6513" }));

            foreach (var (k, v) in new[]
            {
                ("長度", input.RoadLength ?? ""),
                ("路寬", roadWidth),
                ("工程費", input.ConstructionBudget ?? ""),
                ("用地費", input.LandAcquisitionBudget ?? ""),
                ("總經費", input.TotalBudget ?? "")
            })
            {
                var row = new TableRow();
                row.Append(DataKeyCell(k));
                row.Append(DataValCell(v));
                dataTable.Append(row);
            }
            body.Append(dataTable);

            // 兩表格之間空一行
            body.Append(new Paragraph(
                new ParagraphProperties(
                    new SpacingBetweenLines { Line = "480", LineRule = LineSpacingRuleValues.Exact })));

            // 6. 用地取得資訊表格（公聽會 → 徵收核定）
            var landTable = new Table(new TableProperties(
                new TableWidth { Width = "0", Type = TableWidthUnitValues.Auto },
                TableBorders()));

            landTable.AppendChild(new TableGrid(
                new GridColumn { Width = "2547" },
                new GridColumn { Width = "6513" }));

            foreach (var (k, v) in new[]
            {
                ("公聽會",           input.PublicHearing ?? ""),
                ("徵收市價地評會審查", input.MarketPriceReview ?? ""),
                ("協議價購會",        input.NegotiatedPurchaseMeeting ?? ""),
                ("徵收計畫書地政局預審", input.ExpropriationPlanPreReview ?? ""),
                ("徵收計劃書報部",    input.ExpropriationPlanSubmission ?? ""),
                ("徵收核定",         input.ExpropriationApproval ?? "")
            })
            {
                var row = new TableRow();
                row.Append(DataKeyCell(k));
                row.Append(DataValCell(v));
                landTable.Append(row);
            }
            body.Append(landTable);

            // 7. CurrentStatus 內容段落（表格之後，保留換行）
            {
                var statusPara = new Paragraph(
                    new ParagraphProperties(
                        new SpacingBetweenLines { Line = "520", LineRule = LineSpacingRuleValues.Exact }));
                var lines = (input.CurrentStatus ?? "").Split('\n');
                for (int i = 0; i < lines.Length; i++)
                {
                    var run = new Run(KaitiRp(), new Text(lines[i]) { Space = SpaceProcessingModeValues.Preserve });
                    statusPara.Append(run);
                    if (i < lines.Length - 1)
                        statusPara.Append(new Run(new Break()));
                }
                body.Append(statusPara);
            }

            // 3. 開瓶計畫附圖
            if (!string.IsNullOrEmpty(input.ImageBase64))
            {
                try
                {
                    var base64Str = input.ImageBase64;
                    var comma = base64Str.IndexOf(',');
                    if (comma >= 0) base64Str = base64Str[(comma + 1)..];
                    var imgBytes = Convert.FromBase64String(base64Str);

                    var imgType = input.ImageBase64.Contains("image/png") ? ImagePartType.Png : ImagePartType.Jpeg;
                    var imgPart = mainPart.AddImagePart(imgType);
                    using (var imgMs = new MemoryStream(imgBytes))
                        imgPart.FeedData(imgMs);

                    var imgId = mainPart.GetIdOfPart(imgPart);
                    const long cx = 5040000L; // 14 cm
                    const long cy = 3360000L; // 9.33 cm (3:2)

                    var graphicData = new A.GraphicData(
                        new PIC.Picture(
                            new PIC.NonVisualPictureProperties(
                                new PIC.NonVisualDrawingProperties { Id = 0U, Name = "image1" },
                                new PIC.NonVisualPictureDrawingProperties()),
                            new PIC.BlipFill(
                                new A.Blip { Embed = imgId },
                                new A.Stretch(new A.FillRectangle())),
                            new PIC.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = cx, Cy = cy }),
                                new A.PresetGeometry(new A.AdjustValueList()) { Preset = A.ShapeTypeValues.Rectangle })))
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" };

                    var inline = new DW.Inline(
                        new DW.Extent { Cx = cx, Cy = cy },
                        new DW.EffectExtent { LeftEdge = 0L, TopEdge = 0L, RightEdge = 0L, BottomEdge = 0L },
                        new DW.DocProperties { Id = 1U, Name = "Picture 1" },
                        new DW.NonVisualGraphicFrameDrawingProperties(
                            new A.GraphicFrameLocks { NoChangeAspect = true }),
                        new A.Graphic(graphicData));
                    inline.DistanceFromTop = 0U;
                    inline.DistanceFromBottom = 0U;
                    inline.DistanceFromLeft = 0U;
                    inline.DistanceFromRight = 0U;

                    var drawing = new Drawing(inline);

                    body.Append(new Paragraph(
                        new ParagraphProperties(
                            new Justification { Val = JustificationValues.Center },
                            new SpacingBetweenLines { Before = "200" }),
                        new Run(drawing)));
                }
                catch
                {
                    body.Append(new Paragraph(new Run(new Text("（圖片無法嵌入，請手動插入）"))));
                }
            }

            // Page layout: A4, narrow margins
            body.Append(new SectionProperties(
                new PageSize { Width = 11906U, Height = 16838U },
                new PageMargin { Top = 720, Bottom = 720, Left = 1080, Right = 1080 }));

            mainPart.Document.Save();
        }

        private static TableBorders TableBorders() => new(
            new TopBorder { Val = BorderValues.Single, Size = 4, Space = 0, Color = "auto" },
            new BottomBorder { Val = BorderValues.Single, Size = 4, Space = 0, Color = "auto" },
            new LeftBorder { Val = BorderValues.Single, Size = 4, Space = 0, Color = "auto" },
            new RightBorder { Val = BorderValues.Single, Size = 4, Space = 0, Color = "auto" },
            new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4, Space = 0, Color = "auto" },
            new InsideVerticalBorder { Val = BorderValues.Single, Size = 4, Space = 0, Color = "auto" });
    }
}