using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.AreaModel;
using RMIS.Models.RoadModel;
using RMIS.Models.sql;
using static RMIS.Models.RoadModel.RoadClass;

namespace RMIS.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class MapAPIController : ControllerBase
    {
        private readonly MapDBContext _Mapcontext;

        public MapAPIController(MapDBContext Mapcontext)
        {
            _Mapcontext = Mapcontext;
        }
        [HttpGet]
        public async Task<List<RoadClass.View>> GetAllRoad()
        {
            var roads = await _Mapcontext.Roads.Include(road => road.Points).Select(road => new RoadClass.View
            {
                Name = road.Name,
                Points = road.Points
                            .OrderBy(p => p.Index) // 按 Index 排序 Points
                            .Select(p => new RoadClass.View_input
                            {
                                Latitude = p.Latitude,
                                Longitude = p.Longitude,
                                Index = p.Index
                            }).ToList()
            }).ToListAsync();
            return roads;
        }

        [HttpGet]
        public async Task<List<AreaClass.View>> GetAllArea()
        {
            return await _Mapcontext.Areas.Include(area => area.Points).Select(area => new AreaClass.View
            {
                Id = area.Id,
                Name = area.Name,
                Points = area.Points
                            .OrderBy(p => p.Index) // 按 Index 排序 Points
                            .Select(p => new AreaClass.View_input
                            {
                                Latitude = p.Latitude,
                                Longitude = p.Longitude,
                                Index = p.Index
                            }).ToList()
            }).ToListAsync();
        }

        [HttpPost]
        public async Task<RoadClass.IndexView> GetRoadbyPipeline(Guid pipeId)
        {
            var pipeline = await _Mapcontext.Pipelines.FirstOrDefaultAsync(p => p.Id == pipeId);
            var roads = await _Mapcontext.Roads.Include(road => road.Points).Where(r => r.PipelineId == pipeId).Select(road => new RoadClass.Road
            {
                Name = road.Name,
                Points = road.Points
                    .OrderBy(p => p.Index) // 按 Index 排序 Points
                    .Select(p => new RoadClass.View_input
                    {
                        Latitude = p.Latitude,
                        Longitude = p.Longitude,
                        Index = p.Index
                    }).ToList()
            }).ToListAsync();
            var result = new RoadClass.IndexView
            {
                roads = roads,
                color = pipeline.Color
            };
            return result;
        }

        [HttpPost]
        public async Task<AreaClass.IndexView> GetAreabyPipeline(Guid pipeId)
        {
            var pipeline = await _Mapcontext.Pipelines.FirstOrDefaultAsync(p => p.Id == pipeId);
            var areas = await _Mapcontext.Areas.Include(area => area.Points).Where(r => r.PipelineId == pipeId).Select(area => new AreaClass.Area
            {
                Name = area.Name,
                Points = area.Points
                    .OrderBy(p => p.Index) // 按 Index 排序 Points
                    .Select(p => new AreaClass.View_input
                    {
                        Latitude = p.Latitude,
                        Longitude = p.Longitude,
                        Index = p.Index
                    }).ToList()
            }).ToListAsync();
            var result = new AreaClass.IndexView
            {
                areas = areas,
                color = pipeline.Color
            };
            return result;
        }
    }
}
