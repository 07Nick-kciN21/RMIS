using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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

        public RoadProjectController(RoadProjectInterface roadProjectInterface)
        {
            _roadProjectInterface = roadProjectInterface;
        }

        [HttpPost("AddProcess1")]
        public async Task<IActionResult> AddProcess1(RoadProjectProcess1 process1)
        {
            if (process1 == null) return BadRequest(new { success = false, message = "接收不到資料" });

            process1.Id = 0;
            var result = await _roadProjectInterface.AddProcess1Async(process1);

            if (result == "success")
            {
                return Ok(new { success = true, processId = process1.ProcessId });
            }
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
                return Ok(new { success = true, processId = process2.ProcessId });
            }
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
                return Ok(new { success = true, processId = process3.ProcessId });
            }
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
                // 從實體路徑讀取檔案
                var basePath = @"C:\RoadProjectProcessFile";
                var filePath = Path.Combine(basePath, file.ProcessId.ToString(), file.FileName);

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
            var result = await _roadProjectInterface.DeleteProcess1Async(id);

            if (result == "success")
            {
                return Ok(new { success = true, message = "紀錄刪除成功" });
            }

            return BadRequest(new { success = false, message = result });
        }

        [HttpDelete("DeleteProcess2/{id}")]
        public async Task<IActionResult> DeleteProcess2(int id)
        {
            var result = await _roadProjectInterface.DeleteProcess2Async(id);

            if (result == "success")
            {
                return Ok(new { success = true, message = "紀錄刪除成功" });
            }

            return BadRequest(new { success = false, message = result });
        }

        [HttpDelete("DeleteProcess3/{id}")]
        public async Task<IActionResult> DeleteProcess3(int id)
        {
            var result = await _roadProjectInterface.DeleteProcess3Async(id);

            if (result == "success")
            {
                return Ok(new { success = true, message = "紀錄刪除成功" });
            }

            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateProcess1")]
        public async Task<IActionResult> UpdateProcess1([FromBody] RoadProjectProcess1 process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateProcess1Async(process);

            if (result == "success")
            {
                return Ok(new { success = true, processId = process.ProcessId });
            }
            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateProcess2")]
        public async Task<IActionResult> UpdateProcess2([FromBody] RoadProjectProcess2 process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateProcess2Async(process);

            if (result == "success")
            {
                return Ok(new { success = true, processId = process.ProcessId });
            }
            return BadRequest(new { success = false, message = result });
        }

        [HttpPut("UpdateProcess3")]
        public async Task<IActionResult> UpdateProcess3([FromBody] RoadProjectProcess3 process)
        {
            if (process == null) return BadRequest(new { success = false, message = "接收不到資料" });

            var result = await _roadProjectInterface.UpdateProcess3Async(process);

            if (result == "success")
            {
                return Ok(new { success = true, processId = process.ProcessId });
            }
            return BadRequest(new { success = false, message = result });
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
    }
}
