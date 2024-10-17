using Microsoft.AspNetCore.Mvc;
using RMIS.Models.Admin;
using static RMIS.Models.API.IndexClass;

namespace RMIS.Repositories
{
    public interface MapAPIInterface
    {
        Task<List<LayersByPipeline>> GetLayersByPipelineAsync(Guid pipelineId);
        Task<AreasByLayer> GetAreasByLayerAsync(Guid LayerId);
        Task<LayerIdByPipeline> GetLayerIdByPipelineAsync(Guid PipelineId);
        Task<List<RoadbyName>> GetRoadbyNameAsync(string name);
        Task<PointsbyId> GetPointsbyLayerIdAsync(Guid LayerId);
        Task<MapSourceOrderbyTileType> GetMapSourceAsync();
        Task<int> AddBulkAsync([FromBody] List<AddMapSourceInput> mapSources);
    }
}
