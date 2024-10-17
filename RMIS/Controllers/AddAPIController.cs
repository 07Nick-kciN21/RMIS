using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;

namespace RMIS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AddAPIController : ControllerBase
    {
        private readonly MapDBContext _mapDBContext;

        public AddAPIController(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }
        [HttpPost]
        public async Task<IActionResult> AddBulk([FromBody] List<AddMapSourceInput> mapSources)
        {
            if (mapSources == null || mapSources.Count == 0)
            {
                return BadRequest("No MapSource data provided.");
            }

            try
            {
                var mapSourceEntities = mapSources.Select(ms => new MapSource
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
                return Ok(new { message = "MapSources added successfully.", count = mapSources.Count });
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Internal server error: {e.Message}");
            }
        }
    }
}
