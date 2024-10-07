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
        {  // layers根據GeometryTypes orderid排序
            var layers = await _mapDBContext.Layers
                .Include(l => l.GeometryType)
                .OrderBy(l => l.GeometryType.OrderId)
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
        public async Task<AreasByLayer> GetAreasByLayer(Guid LayerId)
        {
            try
            {
                // 從LayerId獲得Areas
                // 從Areas獲得points
                var areas = await _mapDBContext.Areas
                                    .Include(a => a.Points)
                                    .Include(a => a.Layer)
                                        .ThenInclude(l => l.GeometryType)
                                    .Where(a => a.LayerId == LayerId)
                                    .ToListAsync();
                var results = new AreasByLayer
                {
                    id = LayerId.ToString(),
                    name = areas.FirstOrDefault().Layer.Name,
                    svg = areas.FirstOrDefault().Layer.GeometryType.Svg,
                    type = areas.FirstOrDefault().Layer.GeometryType.Kind,
                    areas = areas.Select(a => new AreaDto
                    {
                        id = a.Id.ToString(),
                        ConstructionUnit = a.ConstructionUnit,
                        points = a.Points.Select(p => new PointDto
                        {
                            Index = p.Index,
                            Latitude = p.Latitude,
                            Longitude = p.Longitude
                        }).ToList()
                    }).ToList()
                };
                return results;
            }
            catch (Exception e)
            {
                // 添加錯誤訊息
                ModelState.AddModelError("", "Error: " + e.Message);
                return new AreasByLayer();
            }
        }
    }
}
