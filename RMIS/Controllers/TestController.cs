using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.sql;

namespace RMIS.Controllers
{
    
    [Route("api/[controller]")]
    [ApiController]
    public class TestController : ControllerBase
    {
        private readonly MapDBContext _mapDBContext;

        public TestController(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        [HttpGet("get/Pipeline/DepartmentIds")]
        public async Task<IActionResult> GetDepartmentId(Guid PipelineId)
        {
            try
            {
                var Ids = await _mapDBContext.Pipelines.Where(p => p.Id == PipelineId).Select(p => p.DepartmentIds).ToListAsync();
                var ids = Ids.First();
                if (Ids != null)
                {
                    return Ok(new { success = true, message = ids });
                }
                else
                {
                    return BadRequest(new { success = false, message = "取得失敗" });
                }
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "取得失敗" });
            }
        }

        public class CategoryList
        {
            public Guid Id { get; set; } // 唯一識別碼
            public string Name { get; set; } // 分類名稱
            public int OrderId { get; set; }
            public Guid? ParentId { get; set; }
            // 允許存取的部門 (可多個)
            public List<int> DepartmentIds { get; set; } = new();
        }

        [HttpGet("update/Category/DepartmentIds")]
        public IActionResult UpdateDepartmentId(Guid id)
        {
            try
            {
                var depIds = new List<int>();
                depIds.Add(0);
                depIds.Add(2);
                depIds.Add(1006);
                var rootCategory = _mapDBContext.Categories
                    .Where(c => c.Id == id)
                    .First();
                
                if (rootCategory == null)
                {
                    return BadRequest(new { success = false, message = "找不到分類" });
                }
                rootCategory.DepartmentIds = depIds;
                _mapDBContext.SaveChanges();
                searchCategories(rootCategory.Id, depIds);

                return Ok(new { success = true, message = "更新成功" });
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "更新失敗" });
            }
        }

        private bool searchCategories(Guid? parentId, List<int> deptIds)
        {

            var Categories = _mapDBContext.Categories
                .Where(c => c.ParentId == parentId)
                .OrderBy(c => c.OrderId)
                .ToList();
            foreach(var Category in Categories)
            {
                Category.DepartmentIds = deptIds;
                searchCategories(Category.Id, deptIds);
            }
            _mapDBContext.SaveChanges();
            return true;
        }
    }
}
