using Microsoft.AspNetCore.Mvc;
using RMIS.Models.Admin;
using static RMIS.Models.API.IndexClass;

namespace RMIS.Repositories
{
    public interface MapAPIInterface
    {
        Task<List<LayersByPipeline>> GetLayersByPipelineAsync(int pipelineId);
        Task<AreasByLayer> GetAreasByLayerAsync(int LayerId);
        Task<LayerIdByPipeline> GetLayerIdByPipelineAsync(int PipelineId);
        Task<List<RoadbyName>> GetRoadbyNameAsync(string name);
        Task<PointsbyId> GetPointsbyLayerIdAsync(int AreaId);
        Task<MapSourceOrderbyTileType> GetMapSourceAsync();
        Task<int> AddBulkAsync([FromBody] List<AddMapSourceInput> mapSources);
    }
}
