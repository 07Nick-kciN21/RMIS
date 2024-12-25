using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using static RMIS.Models.API.IndexClass;


namespace RMIS.Repositories
{
    public class MapAPIRepository : MapAPIInterface
    {
        private readonly MapDBContext _mapDBContext;

        public MapAPIRepository(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        public async Task<List<LayersByPipeline>> GetLayersByPipelineAsync(Guid pipelineId)
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

        public async Task<AreasByLayer> GetAreasByLayerAsync(Guid LayerId)
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
                        Longitude = p.Longitude
                    }).ToList()
                }).ToList()
            };
            return results;
        }

        public async Task<LayerIdByPipeline> GetLayerIdByPipelineAsync(Guid PipelineId)
        {
            var results = new LayerIdByPipeline
            {
                LayerIdList = await _mapDBContext.Layers
                        .Where(l => l.PipelineId == PipelineId)
                        .Select(l => l.Id.ToString().ToLower())
                        .ToListAsync()
            };
            return results;
        }

        public async Task<List<RoadbyName>> GetRoadbyNameAsync(string name)
        {
            var results = await _mapDBContext.Areas
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
            return results;
        }
        public async Task<PointsbyId> GetPointsbyLayerIdAsync(Guid LayerId)
        {
            var areas = await _mapDBContext.Areas
                .Include(a => a.Points)
                .FirstOrDefaultAsync(a => a.Id == LayerId);
            var results = new PointsbyId
            {
                Id = LayerId.ToString(),
                Points = areas.Points.OrderBy(p => p.Index).Select(p => new PointDto
                {
                    Index = p.Index,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude
                }).ToList()
            };
            return results;
        }

        public async Task<MapSourceOrderbyTileType> GetMapSourceAsync()
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

        public async Task<int> AddBulkAsync([FromBody] List<AddMapSourceInput> mapSources)
        {
            var mapSourceEntities = mapSources.Select(ms => new RMIS.Models.sql.MapSource
            {
                Name = ms.Name,
                Type = ms.Type,
                TileType = ms.TileType,
                Url = ms.Url,
                SourceId = ms.SourceId,
                Attribution = ms.Attribution,
                ImageFormat = ms.ImageFormat
            }).ToList();

            await _mapDBContext.MapSources.AddRangeAsync(mapSourceEntities);
            await _mapDBContext.SaveChangesAsync();
            var results = await _mapDBContext.SaveChangesAsync();
            return results;
        }
    }
}
