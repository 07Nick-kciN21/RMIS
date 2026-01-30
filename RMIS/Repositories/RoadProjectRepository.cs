using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.sql;
using static RMIS.Models.Map.RoadProject;

namespace RMIS.Repositories
{
    public class RoadProjectRepository : RoadProjectInterface
    {
        private readonly MapDBContext _mapDBContext;

        public RoadProjectRepository(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        public async Task<string> AddProcess1Async(RoadProjectProcess1 process)
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
                process.ProcessId = Guid.NewGuid();

                _mapDBContext.RoadProjectProcess1.Add(process);
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
        }

        public async Task<string> AddProcess2Async(RoadProjectProcess2 process)
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
                process.ProcessId = Guid.NewGuid();

                _mapDBContext.RoadProjectProcess2.Add(process);
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
        }

        public async Task<string> AddProcess3Async(RoadProjectProcess3 process)
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
                process.ProcessId = Guid.NewGuid();

                _mapDBContext.RoadProjectProcess3.Add(process);
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
            var result = new ProjectProcessesList
            {
                Process1List = await _mapDBContext.RoadProjectProcess1
                    .Where(p => p.ProjectId == projectId)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new ProcessRecordDTO
                    {
                        Id = p.Id,
                        RecordType = p.RecordType,
                        RecordTitle = p.RecordTitle,
                        CreatedAt = p.CreatedAt,
                        CurrentStatus = p.CurrentStatus
                    })
                    .ToListAsync(),

                Process2List = await _mapDBContext.RoadProjectProcess2
                    .Where(p => p.ProjectId == projectId)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new ProcessRecordDTO
                    {
                        Id = p.Id,
                        RecordType = p.RecordType,
                        RecordTitle = p.RecordTitle,
                        CreatedAt = p.CreatedAt,
                        CurrentStatus = p.CurrentStatus
                    })
                    .ToListAsync(),

                Process3List = await _mapDBContext.RoadProjectProcess3
                    .Where(p => p.ProjectId == projectId)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new ProcessRecordDTO
                    {
                        Id = p.Id,
                        RecordType = p.RecordType,
                        RecordTitle = p.RecordTitle,
                        CreatedAt = p.CreatedAt,
                        CurrentStatus = p.CurrentStatus
                    })
                    .ToListAsync()
            };

            return result;
        }

        public async Task<string> AddProcessFileAsync(RoadProjectProcessFile file)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            string? savedFilePath = null;

            try
            {
                if (file == null)
                {
                    return "錯誤：接收到的檔案資料為空。";
                }

                // 設定實體路徑
                var basePath = @"C:\RoadProjectProcessFile";
                var processFolder = Path.Combine(basePath, file.ProcessId.ToString());

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
        }

        public async Task<List<RoadProjectProcessFile>> GetProcessFilesByProcessIdAsync(Guid processId)
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

        public async Task<string> DeleteProcessFileAsync(int fileId)
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
                var basePath = @"C:\RoadProjectProcessFile";
                var filePath = Path.Combine(basePath, file.ProcessId.ToString(), file.FileName);

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
        }

        public async Task<string> DeleteProcess1Async(int id)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            var deletedFiles = new List<(string path, byte[] content)>();

            try
            {
                var process = await _mapDBContext.RoadProjectProcess1
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (process == null)
                {
                    return "錯誤：找不到該紀錄。";
                }

                // 刪除相關的檔案（記錄以便回滾）
                deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);

                // 刪除紀錄
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
        }

        public async Task<string> DeleteProcess2Async(int id)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            var deletedFiles = new List<(string path, byte[] content)>();

            try
            {
                var process = await _mapDBContext.RoadProjectProcess2
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (process == null)
                {
                    return "錯誤：找不到該紀錄。";
                }

                // 刪除相關的檔案（記錄以便回滾）
                deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);

                // 刪除紀錄
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
        }

        public async Task<string> DeleteProcess3Async(int id)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            var deletedFiles = new List<(string path, byte[] content)>();

            try
            {
                var process = await _mapDBContext.RoadProjectProcess3
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (process == null)
                {
                    return "錯誤：找不到該紀錄。";
                }

                // 刪除相關的檔案（記錄以便回滾）
                deletedFiles = await DeleteProcessFilesWithBackupAsync(process.ProcessId);

                // 刪除紀錄
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
        }

        /// <summary>
        /// 刪除指定 ProcessId 的所有檔案，並備份以便回滾
        /// </summary>
        private async Task<List<(string path, byte[] content)>> DeleteProcessFilesWithBackupAsync(Guid processId)
        {
            var deletedFiles = new List<(string path, byte[] content)>();

            var files = await _mapDBContext.RoadProjectProcessFiles
                .Where(f => f.ProcessId == processId)
                .ToListAsync();

            var basePath = @"C:\RoadProjectProcessFile";
            var processFolder = Path.Combine(basePath, processId.ToString());

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

        public async Task<string> UpdateProcess1Async(RoadProjectProcess1 process)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _mapDBContext.RoadProjectProcess1
                    .FirstOrDefaultAsync(p => p.Id == process.Id);

                if (existing == null)
                {
                    return "錯誤：找不到該紀錄。";
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

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"更新失敗：{ex.Message}";
            }
        }

        public async Task<string> UpdateProcess2Async(RoadProjectProcess2 process)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _mapDBContext.RoadProjectProcess2
                    .FirstOrDefaultAsync(p => p.Id == process.Id);

                if (existing == null)
                {
                    return "錯誤：找不到該紀錄。";
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

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"更新失敗：{ex.Message}";
            }
        }

        public async Task<string> UpdateProcess3Async(RoadProjectProcess3 process)
        {
            using var transaction = await _mapDBContext.Database.BeginTransactionAsync();
            try
            {
                var existing = await _mapDBContext.RoadProjectProcess3
                    .FirstOrDefaultAsync(p => p.Id == process.Id);

                if (existing == null)
                {
                    return "錯誤：找不到該紀錄。";
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

                await _mapDBContext.SaveChangesAsync();
                await transaction.CommitAsync();
                return "success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"更新失敗：{ex.Message}";
            }
        }
    }
}
