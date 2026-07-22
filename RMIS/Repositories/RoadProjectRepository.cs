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
        public async Task<string> AddProcess1Async(RoadProjectProcess1 process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                if (process == null)
                {
                    return "錯誤：接收到的專案程序資料為空。";
                }

                process.Id = 0;
                process.CreatedAt = DateTime.Now;
                process.ProcessId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

                // 自動計算 OrderIndex (取同專案同階段最大值 + 1)
                if (process.OrderIndex <= 0)
                {
                    var maxOrder = await _mapDBContext.RoadProjectProcess1
                        .Where(p => p.ProjectId == process.ProjectId)
                        .Select(p => (int?)p.OrderIndex)
                        .MaxAsync() ?? 0;
                    process.OrderIndex = maxOrder + 1;
                }
                
                _mapDBContext.RoadProjectProcess1.Add(process);
                await TouchProjectUpdateTimeAsync(process.ProjectId);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫儲存失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> AddProcess2Async(RoadProjectProcess2 process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                if (process == null)
                {
                    return "錯誤：接收到的專案程序資料為空。";
                }

                process.Id = 0;
                process.CreatedAt = DateTime.Now;
                process.ProcessId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

                // 自動計算 OrderIndex
                if (process.OrderIndex <= 0)
                {
                    var maxOrder = await _mapDBContext.RoadProjectProcess2
                        .Where(p => p.ProjectId == process.ProjectId)
                        .Select(p => (int?)p.OrderIndex)
                        .MaxAsync() ?? 0;
                    process.OrderIndex = maxOrder + 1;
                }

                _mapDBContext.RoadProjectProcess2.Add(process);
                await TouchProjectUpdateTimeAsync(process.ProjectId);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫儲存失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> AddProcess3Async(RoadProjectProcess3 process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                if (process == null)
                {
                    return "錯誤：接收到的專案程序資料為空。";
                }

                process.Id = 0;
                process.CreatedAt = DateTime.Now;
                process.ProcessId = DateTime.Now.ToString("yyyyMMddHHmmssfff");

                // 自動計算 OrderIndex
                if (process.OrderIndex <= 0)
                {
                    var maxOrder = await _mapDBContext.RoadProjectProcess3
                        .Where(p => p.ProjectId == process.ProjectId)
                        .Select(p => (int?)p.OrderIndex)
                        .MaxAsync() ?? 0;
                    process.OrderIndex = maxOrder + 1;
                }

                _mapDBContext.RoadProjectProcess3.Add(process);
                await TouchProjectUpdateTimeAsync(process.ProjectId);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                var innerMessage = dbEx.InnerException?.Message ?? dbEx.Message;
                return $"資料庫儲存失敗：{innerMessage}";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"伺服器發生非預期錯誤：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<RoadProjectProcess1?> GetProcess1ByIdAsync(int id)
        {
            return await _mapDBContext.RoadProjectProcess1
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<RoadProjectProcess2?> GetProcess2ByIdAsync(int id)
        {
            return await _mapDBContext.RoadProjectProcess2
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<RoadProjectProcess3?> GetProcess3ByIdAsync(int id)
        {
            return await _mapDBContext.RoadProjectProcess3
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<ProjectProcessesList> GetProcessRecordsAsync(string projectId)
        {
            // 取得所有 Process 記錄
            var process1List = await _mapDBContext.RoadProjectProcess1
                .Where(p => p.ProjectId == projectId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var process2List = await _mapDBContext.RoadProjectProcess2
                .Where(p => p.ProjectId == projectId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var process3List = await _mapDBContext.RoadProjectProcess3
                .Where(p => p.ProjectId == projectId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            // 收集所有 ProcessId
            var allProcessIds = process1List.Select(p => p.ProcessId)
                .Concat(process2List.Select(p => p.ProcessId))
                .Concat(process3List.Select(p => p.ProcessId))
                .ToList();

            // 一次查詢所有相關檔案
            var allFiles = await _mapDBContext.RoadProjectProcessFiles
                .Where(f => allProcessIds.Contains(f.ProcessId))
                .ToListAsync();

            // 建立 ProcessId -> Files 的對照表
            var filesLookup = allFiles
                .GroupBy(f => f.ProcessId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(f => new ProcessFileDTO
                    {
                        Id = f.Id,
                        FileName = f.FileName,
                        FileType = f.FileType,
                        FileSize = f.FileSize
                    }).ToList()
                );

            // 組裝結果
            var result = new ProjectProcessesList
            {
                Process1List = process1List.Select(p => new ProcessRecordDTO
                {
                    Id = p.Id,
                    ProcessId = p.ProcessId,
                    RecordType = p.RecordType,
                    RecordTitle = p.RecordTitle,
                    CreatedAt = p.CreatedAt,
                    CurrentStatus = p.CurrentStatus,
                    Files = filesLookup.TryGetValue(p.ProcessId, out var files1) ? files1 : new List<ProcessFileDTO>()
                }).ToList(),

                Process2List = process2List.Select(p => new ProcessRecordDTO
                {
                    Id = p.Id,
                    ProcessId = p.ProcessId,
                    RecordType = p.RecordType,
                    RecordTitle = p.RecordTitle,
                    CreatedAt = p.CreatedAt,
                    CurrentStatus = p.CurrentStatus,
                    Files = filesLookup.TryGetValue(p.ProcessId, out var files2) ? files2 : new List<ProcessFileDTO>()
                }).ToList(),

                Process3List = process3List.Select(p => new ProcessRecordDTO
                {
                    Id = p.Id,
                    ProcessId = p.ProcessId,
                    RecordType = p.RecordType,
                    RecordTitle = p.RecordTitle,
                    CreatedAt = p.CreatedAt,
                    CurrentStatus = p.CurrentStatus,
                    Files = filesLookup.TryGetValue(p.ProcessId, out var files3) ? files3 : new List<ProcessFileDTO>()
                }).ToList()
            };

            return result;
        }

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

                existing.District = process.District;
                existing.RecordType = process.RecordType;
                existing.RecordTitle = process.RecordTitle;
                existing.ProjectName = process.ProjectName;
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

        public async Task<string> DeleteAllProcessRecordAsync(int id)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
                var deletedFiles = new List<(string path, byte[] content)>();
                try
                {
                    var process = await _mapDBContext.RoadProjectProcesses.FindAsync(id);
                    if (process == null) return "錯誤：找不到該記錄。";

                    deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);
                    _mapDBContext.RoadProjectProcesses.Remove(process);
                    await _mapDBContext.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return "success";
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    await RestoreDeletedFilesAsync(deletedFiles);
                    return $"刪除失敗：{ex.Message}";
                }
            });
        }

        public async Task<string> DeleteProcess1Async(int id)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            var deletedFiles = new List<(string path, byte[] content)>();

            try
            {
                var process = await _mapDBContext.RoadProjectProcess1
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (process == null)
                {
                    return "錯誤：找不到該記錄。";
                }

                // 刪除相關的檔案（記錄以便回滾）
                deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);

                // 刪除記錄
                _mapDBContext.RoadProjectProcess1.Remove(process);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // 回滾：還原已刪除的實體檔案
                await RestoreDeletedFilesAsync(deletedFiles);
                return $"刪除失敗：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> DeleteProcess2Async(int id)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            var deletedFiles = new List<(string path, byte[] content)>();

            try
            {
                var process = await _mapDBContext.RoadProjectProcess2
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (process == null)
                {
                    return "錯誤：找不到該記錄。";
                }

                // 刪除相關的檔案（記錄以便回滾）
                deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);

                // 刪除記錄
                _mapDBContext.RoadProjectProcess2.Remove(process);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // 回滾：還原已刪除的實體檔案
                await RestoreDeletedFilesAsync(deletedFiles);
                return $"刪除失敗：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> DeleteProcess3Async(int id)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            var deletedFiles = new List<(string path, byte[] content)>();

            try
            {
                var process = await _mapDBContext.RoadProjectProcess3
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (process == null)
                {
                    return "錯誤：找不到該記錄。";
                }

                // 刪除相關的檔案（記錄以便回滾）
                deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);

                // 刪除記錄
                _mapDBContext.RoadProjectProcess3.Remove(process);
                await _mapDBContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // 回滾：還原已刪除的實體檔案
                await RestoreDeletedFilesAsync(deletedFiles);
                return $"刪除失敗：{ex.Message}";
            }
            }); // end strategy
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
        /// 依 ProcessId 查詢對應的 (ProjectId, Step, OrderIndex)
        /// </summary>
        private async Task<(string projectId, int step, int orderIndex)?> GetProcessInfoAsync(string processId)
        {
            var p1 = await _mapDBContext.RoadProjectProcess1.FirstOrDefaultAsync(p => p.ProcessId == processId);
            if (p1 != null) return (p1.ProjectId, 1, p1.OrderIndex);

            var p2 = await _mapDBContext.RoadProjectProcess2.FirstOrDefaultAsync(p => p.ProcessId == processId);
            if (p2 != null) return (p2.ProjectId, 2, p2.OrderIndex);

            var p3 = await _mapDBContext.RoadProjectProcess3.FirstOrDefaultAsync(p => p.ProcessId == processId);
            if (p3 != null) return (p3.ProjectId, 3, p3.OrderIndex);

            return null;
        }

        /// <summary>
        /// 依 ProcessId 建立實體文件目錄路徑: {ProcessFile}/{ProjectId}/{Step}/{OrderIndex}
        /// </summary>
        private async Task<string> GetProcessFolderAsync(string processId)
        {
            var info = await GetProcessInfoAsync(processId);
            if (info.HasValue)
                return Path.Combine(ResolvePath(_filePaths.ProcessFile), info.Value.projectId, info.Value.step.ToString(), info.Value.orderIndex.ToString());
            // fallback: 使用 ProcessId (舊資料相容)
            return Path.Combine(ResolvePath(_filePaths.ProcessFile), processId);
        }

        public async Task<string> UpdateProcess1Async(RoadProjectProcess1 process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _mapDBContext.RoadProjectProcess1
                    .FirstOrDefaultAsync(p => p.Id == process.Id);

                if (existing == null)
                {
                    return "錯誤：找不到該記錄。";
                }

                // 更新欄位
                existing.District = process.District;
                existing.RecordType = process.RecordType;
                existing.RecordTitle = process.RecordTitle;
                existing.ExecutionUnit = process.ExecutionUnit;
                existing.ConstructionUnit = process.ConstructionUnit;
                existing.ProjectName = process.ProjectName;
                existing.PreviousMeetingStatus = process.PreviousMeetingStatus;
                existing.PreviousMeetingResolution = process.PreviousMeetingResolution;
                existing.CurrentStatus = process.CurrentStatus;
                existing.CurrentMeetingResolution = process.CurrentMeetingResolution;

                await TouchProjectUpdateTimeAsync(existing.ProjectId);
                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"更新失敗：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> UpdateProcess2Async(RoadProjectProcess2 process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _mapDBContext.RoadProjectProcess2
                    .FirstOrDefaultAsync(p => p.Id == process.Id);

                if (existing == null)
                {
                    return "錯誤：找不到該記錄。";
                }

                // 更新欄位
                existing.District = process.District;
                existing.RecordType = process.RecordType;
                existing.RecordTitle = process.RecordTitle;
                existing.Category = process.Category;
                existing.ExecutionUnit = process.ExecutionUnit;
                existing.ConstructionUnit = process.ConstructionUnit;
                existing.ProjectName = process.ProjectName;
                existing.PreviousMeetingStatus = process.PreviousMeetingStatus;
                existing.PreviousMeetingResolution = process.PreviousMeetingResolution;
                existing.CurrentStatus = process.CurrentStatus;
                existing.CurrentMeetingResolution = process.CurrentMeetingResolution;

                await TouchProjectUpdateTimeAsync(existing.ProjectId);
                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"更新失敗：{ex.Message}";
            }
            }); // end strategy
        }

        public async Task<string> UpdateProcess3Async(RoadProjectProcess3 process)
        {
            var strategy = _mapDBContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _mapDBContext.RoadProjectProcess3
                    .FirstOrDefaultAsync(p => p.Id == process.Id);

                if (existing == null)
                {
                    return "錯誤：找不到該記錄。";
                }

                // 更新欄位
                existing.District = process.District;
                existing.RecordType = process.RecordType;
                existing.RecordTitle = process.RecordTitle;
                existing.ExecutionUnit = process.ExecutionUnit;
                existing.ProjectName = process.ProjectName;
                existing.BudgetFiscalYearApprovedAmount = process.BudgetFiscalYearApprovedAmount;
                existing.ContractType = process.ContractType;
                existing.ConstructionPeriod = process.ConstructionPeriod;
                existing.AnnouncementCommencementDate = process.AnnouncementCommencementDate;
                existing.AwardCompletionDate = process.AwardCompletionDate;
                existing.PreviousMeetingStatus = process.PreviousMeetingStatus;
                existing.PreviousMeetingResolution = process.PreviousMeetingResolution;
                existing.CurrentStatus = process.CurrentStatus;
                existing.CurrentMeetingResolution = process.CurrentMeetingResolution;

                await TouchProjectUpdateTimeAsync(existing.ProjectId);
                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"更新失敗：{ex.Message}";
            }
            }); // end strategy
        }
    }
}
