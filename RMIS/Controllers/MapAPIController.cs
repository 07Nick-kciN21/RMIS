using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using System.Linq;
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
                var areas = await _mapDBContext.Areas
                                    .Include(a => a.Points)
                                    .Include(a => a.Layer)
                                        .ThenInclude(l => l.GeometryType)
                                    .Where(a => a.LayerId == LayerId)
                                    .ToListAsync();
                var layer = await _mapDBContext.Layers.Include(l => l.Pipeline).FirstOrDefaultAsync(l => l.Id == LayerId);
                if (areas.Count == 0)
                {
                    return new AreasByLayer();
                }
                var results = new AreasByLayer
                {
                    id = layer.Id.ToString(),
                    name = layer.Name,
                    color = layer.Pipeline.Color,
                    svg = layer.GeometryType.Svg,
                    type = layer.GeometryType.Kind,
                    areas = areas.Select(a => new AreaDto
                    {
                        id = a.Id.ToString(),
                        ConstructionUnit = a.ConstructionUnit,
                        points = a.Points.OrderBy(p => p.Index).Select(p => new PointDto
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
                ModelState.AddModelError("", "Error: " + e.Message);
                return new AreasByLayer();
            }
        }

        [HttpPost]
        public async Task<LayerIdByPipeline> GetLayerIdByPipeline(Guid PipelineId)
        {
            try
            {
                var LayerIdList = new LayerIdByPipeline
                {
                    LayerIdList = await _mapDBContext.Layers
                        .Where(l => l.PipelineId == PipelineId)
                        .Select(l => l.Id.ToString().ToLower())
                        .ToListAsync()
                };
                return LayerIdList;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new LayerIdByPipeline();
            }
        }

        [HttpPost]
        public async Task<List<RoadbyName>> GetRoadbyName(string name)
        {
            var result = await _mapDBContext.Areas
                .Where(a => a.Name.StartsWith(name))
                .Include(a => a.AdminDist)
                .OrderBy(a => a.AdminDist.orderId)
                .ThenBy(a => a.Name)
                .Select(a => new RoadbyName
                {
                    Id = a.Id.ToString(),
                    Name = a.Name + "(" + a.AdminDist.Town + ")"
                })
                .ToListAsync();
            return result;
        }

        [HttpPost]
        public async Task<PointsbyId> GetPointsbyLayerId(Guid LayerId)
        {
            var result = await _mapDBContext.Areas
                .Include(a => a.Points)
                .FirstOrDefaultAsync(a => a.Id == LayerId);

            if (result == null)
            {
                return new PointsbyId();
            }

            return new PointsbyId
            {
                Id = LayerId.ToString(),
                Points = result.Points.OrderBy(p => p.Index).Select(p => new PointDto
                {
                    Index = p.Index,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude
                }).ToList()
            };
        }
    }
}
