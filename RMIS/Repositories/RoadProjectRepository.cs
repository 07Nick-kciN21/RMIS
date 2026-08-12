using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RMIS.Data;
using RMIS.Models;
using RMIS.Models.sql;
using static RMIS.Models.Map.RoadProject;

namespace RMIS.Repositories
{
    public class RoadProjectRepository : RoadProjectInterface
    {
        private readonly MapDBContext _mapDBContext;
        private readonly FilePathSettings _filePaths;
        private readonly IWebHostEnvironment _env;

        public RoadProjectRepository(MapDBContext mapDBContext, IOptions<FilePathSettings> filePaths, IWebHostEnvironment env)
        {
            _mapDBContext = mapDBContext;
            _filePaths = filePaths.Value;
            _env = env;
        }

        private string ResolvePath(string path) =>
            Path.GetFullPath(path, _env.ContentRootPath);

        public async Task<List<RoadProjectProcess>> GetAllProcessRecordsAsync(string projectId)
        {
            return await _mapDBContext.RoadProjectProcesses
                .Where(p => p.ProjectId == projectId)
                .OrderBy(p => p.OrderIndex)
                .ToListAsync();
        }

        public async Task<List<RoadProjectProcess>> GetLastProcessRecordsByProjectIdsAsync(List<string> projectIds)
        {
            var records = await _mapDBContext.RoadProjectProcesses
                .Where(p => projectIds.Contains(p.ProjectId) && p.RecordType != "局長補充格式")
                .GroupBy(p => p.ProjectId)
                .Select(g => g.OrderByDescending(p => p.OrderIndex).First())
                .ToListAsync();

            var proposerMap = await _mapDBContext.RoadProjects
                .Where(p => projectIds.Contains(p.ProjectId))
                .Select(p => new { p.ProjectId, p.Proposer })
                .ToDictionaryAsync(p => p.ProjectId, p => p.Proposer);

            foreach (var r in records)
                r.Proposer = proposerMap.GetValueOrDefault(r.ProjectId);

            return records;
        }

        public async Task<(string result, string processId)> AddAllProcessRecordAsync(RoadProjectProcess process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
                try
                {
                    if (process == null)
                        return ("錯誤：資料為空。", string.Empty);

                    process.Id = 0;
                    process.CreatedAt = DateTime.Now;
                    process.ProcessId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

                    var project = await _mapDBContext.RoadProjects
                        .Where(p => p.ProjectId == process.ProjectId)
                        .Select(p => new { p.ProjectName, p.StartEndLocation })
                        .FirstOrDefaultAsync();
                    process.ProjectName = project?.ProjectName ?? project?.StartEndLocation;

                    if (process.OrderIndex <= 0)
                    {
                        var maxOrder = await _mapDBContext.RoadProjectProcesses
                            .Where(p => p.ProjectId == process.ProjectId)
                            .Select(p => (int?)p.OrderIndex)
                            .MaxAsync() ?? 0;
                        process.OrderIndex = maxOrder + 1;
                    }

                    _mapDBContext.RoadProjectProcesses.Add(process);
                    await TouchProjectUpdateTimeAsync(process.ProjectId);
                    await _mapDBContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return ("success", process.ProcessId);
                }
                catch (DbUpdateException dbEx)
                {
                    await transaction.RollbackAsync();
                    return ($"資料庫儲存失敗：{dbEx.InnerException?.Message ?? dbEx.Message}", string.Empty);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return ($"伺服器發生非預期錯誤：{ex.Message}", string.Empty);
                }
            });
        }

        public async Task<string> AddProcessFileAsync(RoadProjectProcessFile file)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            string? savedFilePath = null;

            try
            {
                if (file == null)
                {
                    return "錯誤：接收到的檔案資料為空。";
                }

                // 設定實體路徑: {ProcessFile}/{ProjectId}/{Step}/{OrderIndex}
                var processFolder = await GetProcessFolderAsync(file.ProcessId);

                // 建立資料夾（如果不存在）
                if (!Directory.Exists(processFolder))
                {
                    Directory.CreateDirectory(processFolder);
                }

                // 將 Base64 解碼並儲存為實體檔案
                var fileBytes = Convert.FromBase64String(file.Base64String);
                var filePath = Path.Combine(processFolder, file.FileName);

                // 如果檔案已存在，加上時間戳避免覆蓋
                if (File.Exists(filePath))
                {
                    var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
                    var extension = Path.GetExtension(file.FileName);
                    var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
                    filePath = Path.Combine(processFolder, $"{fileNameWithoutExt}_{timestamp}{extension}");
                    file.FileName = Path.GetFileName(filePath);
                }

                await File.WriteAllBytesAsync(filePath, fileBytes);
                savedFilePath = filePath; // 記錄已儲存的檔案路徑，以便回滾時刪除

                // 清空 Base64String（不需要存到資料庫，節省空間）
                file.Base64String = "";

                file.Id = 0;
                _mapDBContext.RoadProjectProcessFiles.Add(file);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                // 回滾：刪除已儲存的實體檔案
                if (savedFilePath != null && File.Exists(savedFilePath))
                {
                    File.Delete(savedFilePath);
                }
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫儲存失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // 回滾：刪除已儲存的實體檔案
                if (savedFilePath != null && File.Exists(savedFilePath))
                {
                    File.Delete(savedFilePath);
                }
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<List<RoadProjectProcessFile>> GetProcessFilesByProcessIdAsync(string processId)
        {
            return await _mapDBContext.RoadProjectProcessFiles
                .Where(f => f.ProcessId == processId)
                .ToListAsync();
        }

        public async Task<RoadProjectProcessFile?> GetProcessFileByIdAsync(int fileId)
        {
            return await _mapDBContext.RoadProjectProcessFiles
                .FirstOrDefaultAsync(f => f.Id == fileId);
        }

        public async Task<string> GetProcessFilePathAsync(string processId, string fileName)
        {
            var folder = await GetProcessFolderAsync(processId);
            return Path.Combine(folder, fileName);
        }

        public async Task<string> DeleteProcessFileAsync(int fileId)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            string? deletedFilePath = null;
            byte[]? deletedFileContent = null;

            try
            {
                var file = await _mapDBContext.RoadProjectProcessFiles
                    .FirstOrDefaultAsync(f => f.Id == fileId);

                if (file == null)
                {
                    return "錯誤：找不到該檔案。";
                }

                // 記錄檔案資訊以便回滾
                var processFolder = await GetProcessFolderAsync(file.ProcessId);
                var filePath = Path.Combine(processFolder, file.FileName);

                if (File.Exists(filePath))
                {
                    deletedFilePath = filePath;
                    deletedFileContent = await File.ReadAllBytesAsync(filePath);
                    File.Delete(filePath);
                }

                // 刪除資料庫記錄
                _mapDBContext.RoadProjectProcessFiles.Remove(file);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                // 回滾：還原已刪除的實體檔案
                if (deletedFilePath != null && deletedFileContent != null)
                {
                    await File.WriteAllBytesAsync(deletedFilePath, deletedFileContent);
                }
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫刪除失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // 回滾：還原已刪除的實體檔案
                if (deletedFilePath != null && deletedFileContent != null)
                {
                    await File.WriteAllBytesAsync(deletedFilePath, deletedFileContent);
                }
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        /// <summary>
        /// 依 ProjectId 建立備註附件的實體文件目錄路徑: {RemarkFile}/{ProjectId}
        /// </summary>
        private string GetRemarkFolder(int projectId) =>
            Path.Combine(ResolvePath(_filePaths.RemarkFile), projectId.ToString());

        public async Task<string> AddRemarkFileAsync(RoadProjectRemarkFile file)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            string? savedFilePath = null;

            try
            {
                if (file == null)
                {
                    return "錯誤：接收到的檔案資料為空。";
                }

                var remarkFolder = GetRemarkFolder(file.ProjectId);

                if (!Directory.Exists(remarkFolder))
                {
                    Directory.CreateDirectory(remarkFolder);
                }

                var fileBytes = Convert.FromBase64String(file.Base64String);
                var filePath = Path.Combine(remarkFolder, file.FileName);

                // 如果檔案已存在，加上時間戳避免覆蓋
                if (File.Exists(filePath))
                {
                    var fileNameWithoutExt = Path.GetFileNameWithoutExtension(file.FileName);
                    var extension = Path.GetExtension(file.FileName);
                    var timestamp = DateTime.Now.ToString("yyyyMMddHHmmss");
                    filePath = Path.Combine(remarkFolder, $"{fileNameWithoutExt}_{timestamp}{extension}");
                    file.FileName = Path.GetFileName(filePath);
                }

                await File.WriteAllBytesAsync(filePath, fileBytes);
                savedFilePath = filePath; // 記錄已儲存的檔案路徑，以便回滾時刪除

                // 清空 Base64String（不需要存到資料庫，節省空間）
                file.Base64String = "";

                file.Id = 0;
                _mapDBContext.RoadProjectRemarkFiles.Add(file);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                if (savedFilePath != null && File.Exists(savedFilePath))
                {
                    File.Delete(savedFilePath);
                }
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫儲存失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                if (savedFilePath != null && File.Exists(savedFilePath))
                {
                    File.Delete(savedFilePath);
                }
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<List<RoadProjectRemarkFile>> GetRemarkFilesByProjectIdAsync(int projectId)
        {
            return await _mapDBContext.RoadProjectRemarkFiles
                .Where(f => f.ProjectId == projectId)
                .ToListAsync();
        }

        public async Task<RoadProjectRemarkFile?> GetRemarkFileByIdAsync(int fileId)
        {
            return await _mapDBContext.RoadProjectRemarkFiles
                .FirstOrDefaultAsync(f => f.Id == fileId);
        }

        public Task<string> GetRemarkFilePathAsync(int projectId, string fileName)
        {
            var folder = GetRemarkFolder(projectId);
            return Task.FromResult(Path.Combine(folder, fileName));
        }

        public async Task<string> DeleteRemarkFileAsync(int fileId)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            string? deletedFilePath = null;
            byte[]? deletedFileContent = null;

            try
            {
                var file = await _mapDBContext.RoadProjectRemarkFiles
                    .FirstOrDefaultAsync(f => f.Id == fileId);

                if (file == null)
                {
                    return "錯誤：找不到該檔案。";
                }

                var remarkFolder = GetRemarkFolder(file.ProjectId);
                var filePath = Path.Combine(remarkFolder, file.FileName);

                if (File.Exists(filePath))
                {
                    deletedFilePath = filePath;
                    deletedFileContent = await File.ReadAllBytesAsync(filePath);
                    File.Delete(filePath);
                }

                _mapDBContext.RoadProjectRemarkFiles.Remove(file);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                if (deletedFilePath != null && deletedFileContent != null)
                {
                    await File.WriteAllBytesAsync(deletedFilePath, deletedFileContent);
                }
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫刪除失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                if (deletedFilePath != null && deletedFileContent != null)
                {
                    await File.WriteAllBytesAsync(deletedFilePath, deletedFileContent);
                }
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> UpdateAllProcessRecordAsync(RoadProjectProcess process)
        {
            try
            {
                var existing = await _mapDBContext.RoadProjectProcesses.FindAsync(process.Id);
                if (existing == null) return "錯誤：找不到該記錄。";

                var project = await _mapDBContext.RoadProjects
                    .Where(p => p.ProjectId == existing.ProjectId)
                    .Select(p => new { p.ProjectName, p.StartEndLocation })
                    .FirstOrDefaultAsync();

                existing.District = process.District;
                existing.RecordType = process.RecordType;
                existing.RecordTitle = process.RecordTitle;
                existing.ProjectName = project?.ProjectName ?? project?.StartEndLocation;
                existing.ExecutionUnit = process.ExecutionUnit;
                existing.ConstructionUnit = process.ConstructionUnit;
                existing.Category = process.Category;
                existing.PublicHearing = process.PublicHearing;
                existing.MarketPriceReview = process.MarketPriceReview;
                existing.NegotiatedPurchaseMeeting = process.NegotiatedPurchaseMeeting;
                existing.ExpropriationPlanPreReview = process.ExpropriationPlanPreReview;
                existing.ExpropriationPlanSubmission = process.ExpropriationPlanSubmission;
                existing.ExpropriationApproval = process.ExpropriationApproval;
                existing.BudgetFiscalYearApprovedAmount = process.BudgetFiscalYearApprovedAmount;
                existing.ContractType = process.ContractType;
                existing.ConstructionPeriod = process.ConstructionPeriod;
                existing.AnnouncementCommencementDate = process.AnnouncementCommencementDate;
                existing.AwardCompletionDate = process.AwardCompletionDate;
                existing.DesignDispatch = process.DesignDispatch;
                existing.BasicDesignApproval = process.BasicDesignApproval;
                existing.DetailedDesignApproval = process.DetailedDesignApproval;
                existing.ConstructionExecution = process.ConstructionExecution;
                existing.PreviousMeetingStatus = process.PreviousMeetingStatus;
                existing.PreviousMeetingResolution = process.PreviousMeetingResolution;
                existing.CurrentStatus = process.CurrentStatus;
                existing.CurrentMeetingResolution = process.CurrentMeetingResolution;
                existing.LandAcquisitionBudget = process.LandAcquisitionBudget;
                existing.ConstructionBudget = process.ConstructionBudget;

                await TouchProjectUpdateTimeAsync(existing.ProjectId);
                await _mapDBContext.SaveChangesAsync();
                return "success";
            }
            catch (Exception ex)
            {
                return $"更新失敗：{ex.Message}";
            }
        }

        public async Task<(string result, string? ProjectName, string? RecordTitle)> DeleteAllProcessRecordAsync(int id)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
                var deletedFiles = new List<(string path, byte[] content)>();
                string? projectName = null;
                string? recordTitle = null;
                try
                {
                    var process = await _mapDBContext.RoadProjectProcesses.FindAsync(id);
                    if (process == null) return ("錯誤：無此記錄可刪除。", (string?)null, (string?)null);

                    projectName = process.ProjectName;
                    recordTitle = process.RecordTitle;

                    deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);
                    _mapDBContext.RoadProjectProcesses.Remove(process);
                    await _mapDBContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return ("success", projectName, recordTitle);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    await RestoreDeletedFilesAsync(deletedFiles);
                    return ($"刪除失敗：{ex.Message}", projectName, recordTitle);
                }
            });
        }

        /// <summary>
        /// 刪除指定 ProcessId 的所有檔案，並備份以便回滾
        /// </summary>
        private async Task<List<(string path, byte[] content)>> DeleteProcessFilesWithBackupAsync(string processId)
        {
            var deletedFiles = new List<(string path, byte[] content)>();

            var files = await _mapDBContext.RoadProjectProcessFiles
                .Where(f => f.ProcessId == processId)
                .ToListAsync();

            var processFolder = await GetProcessFolderAsync(processId);

            // 備份並刪除實體檔案
            foreach (var file in files)
            {
                var filePath = Path.Combine(processFolder, file.FileName);
                if (File.Exists(filePath))
                {
                    var content = await File.ReadAllBytesAsync(filePath);
                    deletedFiles.Add((filePath, content));
                    File.Delete(filePath);
                }
            }

            // 刪除資料夾（如果為空）
            if (Directory.Exists(processFolder) && !Directory.EnumerateFileSystemEntries(processFolder).Any())
            {
                Directory.Delete(processFolder);
            }

            // 刪除資料庫記錄
            _mapDBContext.RoadProjectProcessFiles.RemoveRange(files);

            return deletedFiles;
        }

        /// <summary>
        /// 將對應 ProjectId 的 RoadProject.UpdateTime 設為現在（不呼叫 SaveChanges，由呼叫端統一儲存）
        /// </summary>
        private async Task TouchProjectUpdateTimeAsync(string? projectId)
        {
            if (string.IsNullOrEmpty(projectId)) return;
            var rp = await _mapDBContext.RoadProjects.FirstOrDefaultAsync(r => r.ProjectId == projectId);
            if (rp != null) rp.UpdateTime = DateTime.Now;
        }

        /// <summary>
        /// 還原已刪除的檔案
        /// </summary>
        private async Task RestoreDeletedFilesAsync(List<(string path, byte[] content)> deletedFiles)
        {
            foreach (var (path, content) in deletedFiles)
            {
                var directory = Path.GetDirectoryName(path);
                if (directory != null && !Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }
                await File.WriteAllBytesAsync(path, content);
            }
        }

        /// <summary>
        /// 依 ProcessId 建立實體文件目錄路徑: {ProcessFile}/{ProcessId}
        /// </summary>
        private Task<string> GetProcessFolderAsync(string processId)
        {
            return Task.FromResult(Path.Combine(ResolvePath(_filePaths.ProcessFile), processId));
        }

    }
}
