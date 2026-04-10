using RMIS.Models.sql;
using static RMIS.Models.Map.RoadProject;

namespace RMIS.Repositories
{
    public interface RoadProjectInterface
    {
        public Task<string> AddProcess1Async(RoadProjectProcess1 process);
        public Task<string> AddProcess2Async(RoadProjectProcess2 process);
        public Task<string> AddProcess3Async(RoadProjectProcess3 process);
        public Task<RoadProjectProcess1?> GetProcess1ByIdAsync(int id);
        public Task<RoadProjectProcess2?> GetProcess2ByIdAsync(int id);
        public Task<RoadProjectProcess3?> GetProcess3ByIdAsync(int id);
        public Task<ProjectProcessesList> GetProcessRecordsAsync(string projectId);
        public Task<string> AddProcessFileAsync(RoadProjectProcessFile file);
        public Task<List<RoadProjectProcessFile>> GetProcessFilesByProcessIdAsync(Guid processId);
        public Task<RoadProjectProcessFile?> GetProcessFileByIdAsync(int fileId);
        public Task<string> GetProcessFilePathAsync(Guid processId, string fileName);
        public Task<string> DeleteProcessFileAsync(int fileId);
        public Task<string> DeleteProcess1Async(int id);
        public Task<string> DeleteProcess2Async(int id);
        public Task<string> DeleteProcess3Async(int id);
        public Task<string> UpdateProcess1Async(RoadProjectProcess1 process);
        public Task<string> UpdateProcess2Async(RoadProjectProcess2 process);
        public Task<string> UpdateProcess3Async(RoadProjectProcess3 process);
    }
}
