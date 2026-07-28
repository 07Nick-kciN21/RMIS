using RMIS.Models.sql;
using static RMIS.Models.Map.RoadProject;

namespace RMIS.Repositories
{
    public interface RoadProjectInterface
    {
        public Task<List<RoadProjectProcess>> GetAllProcessRecordsAsync(string projectId);
        public Task<List<RoadProjectProcess>> GetLastProcessRecordsByProjectIdsAsync(List<string> projectIds);
        public Task<(string result, string processId)> AddAllProcessRecordAsync(RoadProjectProcess process);
        public Task<string> UpdateAllProcessRecordAsync(RoadProjectProcess process);
        public Task<string> DeleteAllProcessRecordAsync(int id);
        public Task<string> AddProcessFileAsync(RoadProjectProcessFile file);
        public Task<List<RoadProjectProcessFile>> GetProcessFilesByProcessIdAsync(string processId);
        public Task<RoadProjectProcessFile?> GetProcessFileByIdAsync(int fileId);
        public Task<string> GetProcessFilePathAsync(string processId, string fileName);
        public Task<string> DeleteProcessFileAsync(int fileId);
        public Task<string> AddRemarkFileAsync(RoadProjectRemarkFile file);
        public Task<List<RoadProjectRemarkFile>> GetRemarkFilesByProjectIdAsync(int projectId);
        public Task<RoadProjectRemarkFile?> GetRemarkFileByIdAsync(int fileId);
        public Task<string> GetRemarkFilePathAsync(int projectId, string fileName);
        public Task<string> DeleteRemarkFileAsync(int fileId);
    }
}
