using RMIS.Models.Account.Mapdatas;

namespace RMIS.Repositories
{
    public interface MapdataInterface
    {
        Task<MapdataManager> GetMapdataManagerDataAsync();
        Task<List<MapdataLayer>> GetMapdataLayersAsync(int id);
        Task<List<MapdatAdminDist>> GetMapdataDistsAsync(int id);
        Task<List<MapdataArea>> GetMapdataAreasAsync(int LayerId, string Dist);
        Task<string> GetMapdataImportSetting(int LayerId);
        Task<MapdataSearch> GetMapdataSearchAsync(int LayerId, string Dist, int AreaId);
        Task<List<MapdataPoint>> GetMapdataPointsAsync(int id);
        Task<(bool Success, string? Message)> ImportMapdataAsync(ImportMapdataView importMapata);
        Task<(bool Success, string Message)> DeleteMapdataAreaAsync(int id, string associateLayer);
        Task<(bool Success, string Message)> UpdateDatainfoAsync(UpdateDatainfo datainfo);
        Task<(bool Success, string? Data, string Message)> GetDatainfoAsync(int id);
        Task<(bool Success, string? Message)> ImportNotGeneralAsync(ImportMapdataView importMapata);
    }
}
