using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using System.Linq;
using RMIS.Models.API;
using RMIS.Models.sql;

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

        [HttpGet]
        public IActionResult GetLayers(Guid pipelineId)
        {
            var layers = _mapDBContext.Layers
                .Where(l => l.PipelineId == pipelineId)
                .OrderBy(l => l.GeometryType.OrderId)
                .Select(l => new { l.Id, l.Name })
                .ToList();
            return Ok(layers);
        }

        [HttpPost]
        public async Task<List<LayersByPipeline>> GetLayersByPipeline(Guid pipelineId)
        {
            try
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
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new List<LayersByPipeline>();
            }
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
                    color = layer.GeometryType.Color,
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
                            Longitude = p.Longitude,
                            Prop = p.Property
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
            try
            {
                var result = await _mapDBContext.Areas
                    .Where(a => a.Name.StartsWith(name) && a.Layer.Pipeline.Name == "道路")
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
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new List<RoadbyName>();
            }
        }

        [HttpPost]
        public async Task<PointsbyId> GetPointsbyLayerId(Guid LayerId)
        {
            try
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
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new PointsbyId();
            }
        }

        [HttpPost]
        public async Task<MapSourceOrderbyTileType> GetMapSources()
        {
            try
            {
                var mapSources = await _mapDBContext.MapSources.ToListAsync();

                var wmsSources = mapSources.Where(ms => ms.TileType == "WMS").ToList();
                var wmtsSources = mapSources.Where(ms => ms.TileType == "WMTS").ToList();

                var result = new MapSourceOrderbyTileType
                {
                    WMS = wmsSources.Select(ms => new MapSource
                    {
                        Id = ms.Id,
                        Name = ms.Name,
                        Type = ms.Type,
                        Url = ms.Url,
                        SourceId = ms.SourceId,
                        Attribution = ms.Attribution,
                        ImageFormat = ms.ImageFormat
                    }).ToList(),
                    WMTS = wmtsSources.Select(ms => new MapSource
                    {
                        Id = ms.Id,
                        Name = ms.Name,
                        Type = ms.Type,
                        Url = ms.Url,
                        SourceId = ms.SourceId,
                        Attribution = ms.Attribution,
                        ImageFormat = ms.ImageFormat
                    }).ToList()
                };

                return result;
            }
            catch (Exception e)
            {
                ModelState.AddModelError("", "Error: " + e.Message);
                return new MapSourceOrderbyTileType();
            }
        }

        [HttpPost]
        public async Task<IActionResult> ClearData(Guid PipelineId)
        {
            var layers = await _mapDBContext.Layers
                .Where(l => l.PipelineId == PipelineId)
                .ToListAsync();

            if (layers == null || !layers.Any())
            {
                return NotFound("No layers found for the given PipelineId.");
            }

            foreach (var layer in layers)
            {
                var areas = await _mapDBContext.Areas
                    .Where(a => a.LayerId == layer.Id)
                    .ToListAsync();

                foreach (var area in areas)
                {
                    var points = await _mapDBContext.Points
                        .Where(p => p.AreaId == area.Id)
                        .ToListAsync();

                    _mapDBContext.Points.RemoveRange(points);
                }

                _mapDBContext.Areas.RemoveRange(areas);
            }

            await _mapDBContext.SaveChangesAsync();

            // 清除PipeLine底下的所有資料
            return Ok("Data cleared successfully.");
        }

        [HttpGet]
        public async Task<IActionResult> GetGeoKindByPipeId(Guid pipelineId)
        {
            // 先取得 layer
            var layer = await _mapDBContext.Layers
                .Where(l => l.PipelineId == pipelineId)
                .Select(l => new { l.GeometryTypeId }) // 只查詢需要的欄位
                .FirstOrDefaultAsync();

            // 檢查 layer 是否為 null
            if (layer == null)
            {
                return NotFound("PipelineId 未找到對應的 Layer 資料。");
            }

            // 透過 GeometryTypeId 取得 GeometryType
            var geometryKind = await _mapDBContext.GeometryTypes
                .Select(gt => new { gt.Id, gt.Kind })
                .FirstOrDefaultAsync(gt => gt.Id == layer.GeometryTypeId);

            if (geometryKind == null)
            {
                return NotFound("未找到對應的 GeometryType 資料。");
            }

            return Ok(geometryKind);
        }
    }
}
