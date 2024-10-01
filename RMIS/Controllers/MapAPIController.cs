using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using static RMIS.Models.API.IndexClass;

namespace RMIS.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class MapAPIController : ControllerBase
    {
        private readonly MapDBContext _dbContext;

        public MapAPIController(MapDBContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// 根據管道ID獲取道路
        /// </summary>
        /// <param name="pipelineId">管道ID</param>
        /// <returns>道路索引視圖</returns>
        [HttpPost]
        public async Task<LayersByPipeline> GetLayersByPipeline(Guid pipelineId)
        {
            var pipeline = await _dbContext.Pipelines.FirstOrDefaultAsync(p => p.Id == pipelineId);

            var result = new LayersByPipeline
            {
                // 該id下的所有Layer
                // 該Layer下的所有Area
            };
            return result;
        }
    }
}
