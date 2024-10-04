using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.sql;
using static RMIS.Models.API.IndexClass;

namespace RMIS.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class MapAPIController : ControllerBase
    {
        private readonly MapDBContext _mapDBContext;

        public MapAPIController(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        /// <summary>
        /// 根據管道ID獲取道路
        /// </summary>
        /// <param name="pipelineId">管道ID</param>
        /// <returns>道路索引視圖</returns>
        [HttpPost]
        public async Task<List<LayersByPipeline>> GetLayersByPipeline(Guid pipelineId)
        {
            var layers = await _mapDBContext.Layers
                .Include(l => l.GeometryType)
                .Where(l => l.PipelineId == pipelineId)
                .ToListAsync();

            var results = layers.Select(l => new LayersByPipeline
            {
                id = l.Id.ToString(),
                name = l.Name,
                svg = l.GeometryType.Svg
            }).ToList();

            return results;
        }

        [HttpPost]
        public async Task<List<PointsByLayer>> GetPointsByLayer(Guid LayerId)
        {
            try
            {
                var areas = await _mapDBContext.Areas
                    .Where(a => a.LayerId == LayerId)
                    .ToListAsync();

                var result = new List<PointsByLayer>(); // Create an empty list

                foreach (var area in areas)
                {
                    var points = await _mapDBContext.Points
                        .Where(p => p.AreaId == area.Id)
                        .OrderBy(p => p.Index)
                        .Select(p => new PointDto // 使用 PointDto 映射屬性
                        {
                            Index = p.Index,
                            Latitude = p.Latitude,
                            Longitude = p.Longitude
                        })
                        .ToListAsync();

                    var pointsByLayer = new PointsByLayer
                    {
                        id = area.Id.ToString(),
                        name = area.Name,
                        points = points
                    };

                    result.Add(pointsByLayer);
                }

                return result;
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                ModelState.AddModelError("", "Error: " + e.Message);
                return new List<PointsByLayer>();
            }
        }
    }
}
