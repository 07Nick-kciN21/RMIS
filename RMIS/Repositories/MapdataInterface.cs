using RMIS.Models.Account.Mapdatas;

namespace RMIS.Repositories
{
    public interface MapdataInterface
    {
        Task<MapdataManager> GetMapdataManagerDataAsync();
        Task<List<MapdataLayer>> GetMapdataLayersAsync(Guid id);
        Task<List<MapdatAdminDist>> GetMapdataDistsAsync(Guid id);
        Task<List<MapdataArea>> GetMapdataAreasAsync(Guid LayerId, string Dist);
        Task<string> GetMapdataImportSetting(Guid LayerId);
        Task<MapdataSearch> GetMapdataSearchAsync(Guid LayerId, string Dist, Guid AreaId);
        Task<List<MapdataPoint>> GetMapdataPointsAsync(Guid id);
        Task<(bool Success, string? Message)> ImportMapdataAsync(ImportMapdataView importMapata);
        Task<(bool Success, string Message)> DeleteMapdataAreaAsync(Guid id);
        Task<(bool Success, string Message)> UpdateDatainfoAsync(UpdateDatainfo datainfo);
        Task<(bool Success, string? Data, string Message)> GetDatainfoAsync(Guid id);

        Task<(bool Success, string? Message)> ImportNotGeneralAsync(ImportMapdataView importMapata);
    }
}
