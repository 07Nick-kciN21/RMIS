using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Account.Users;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using RMIS.Repositories;

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
        public IActionResult UpdateDepartmentId(Guid id, int deptId)
        {
            try
            {
                var rootCategory = _mapDBContext.Categories
                    .Where(c => c.Id == id)
                    .First();
                
                if (rootCategory == null)
                {
                    return BadRequest(new { success = false, message = "找不到分類" });
                }
                rootCategory.DepartmentIds.Add(deptId);
                _mapDBContext.SaveChanges();
                searchCategories(rootCategory.Id, deptId);

                return Ok(new { success = true, message = "更新成功" });
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "更新失敗" });
            }
        }

        private bool searchCategories(Guid? parentId, int deptIds)
        {
            var Pipelines = _mapDBContext.Pipelines.Where(p => p.CategoryId == parentId).ToList();
            foreach(var pipeline in Pipelines)
            {
                pipeline.DepartmentIds.Add(deptIds);
            }
            var Categories = _mapDBContext.Categories
                .Where(c => c.ParentId == parentId)
                .OrderBy(c => c.OrderId)
                .ToList();
            foreach(var Category in Categories)
            {
                Category.DepartmentIds.Add(deptIds);
                searchCategories(Category.Id, deptIds);
            }
            _mapDBContext.SaveChanges();
            return true;
        }
        [HttpGet("Get/TreeData")]
        public async Task<IActionResult> BuildTreeData(int departmentId)
        {
            // 取得所有具有部門代號的根Categories
            var allCategories = await _mapDBContext.Categories.ToListAsync();
            var jsTreeData = BuildJsTreeData(allCategories, null, departmentId);
            return Ok(new { menuData = jsTreeData });
        }
        private List<object> BuildJsTreeData(List<Category> allCategories, Guid? parentId, int deptId)
        {
            var result = new List<object>();
            // 選擇當前層級的分類
            var currentCategories = allCategories.Where(c => c.ParentId == parentId).OrderBy(c => c.OrderId).ToList();
            foreach (var category in currentCategories)
            {
                // 創建分類節點
                var categoryNode = new
                {
                    id = category.Id.ToString(),
                    text = category.Name,
                    parent = parentId.HasValue ? parentId.Value.ToString() : "#",
                    children = new List<object>(),
                    tag = "node"
                };

                // 獲取該分類下的所有管道
                var currentPipelines = _mapDBContext.Pipelines.Where(p => p.CategoryId == category.Id).ToList();
                foreach (var pipeline in currentPipelines)
                {
                    // 為每個管道創建節點
                    var pipelineNode = new
                    {
                        id = pipeline.Id.ToString(),
                        text = pipeline.Name,
                        parent = category.Id.ToString(),
                        children = false, // 管道不再有子節點，設定 children 為 false
                        tag = "pipeline"
                    };

                    // 將管道節點添加到分類的 children 中
                    ((List<object>)categoryNode.children).Add(pipelineNode);
                }

                // 處理該分類的子分類
                var childCategories = BuildJsTreeData(allCategories, category.Id, deptId);
                if (childCategories.Any())
                {
                    ((List<object>)categoryNode.children).AddRange(childCategories);
                }
                result.Add(categoryNode);
            }
            return result;
        }

        [HttpGet("Get/CatData")]
        public async Task<IActionResult> searchTree(Guid id)
        {
            var Categories = await _mapDBContext.Categories.ToListAsync();
            var result = BuildJsTreeData(Categories, id, 0);
            return Ok(result);
        }

        [HttpPost("Update/Pipeline/DepartmentId")]
        public async Task<IActionResult> searchTree(Guid pipeId, int deptId)
        {
            var pipeline = _mapDBContext.Pipelines.Find(pipeId);
            pipeline.DepartmentIds.Add(deptId);
            searchParentCategory(pipeline.CategoryId, deptId);
            _mapDBContext.SaveChanges();
            return Ok("更新完成");
        }
        private void searchParentCategory(Guid? id, int deptId)
        {
            var parentCat = _mapDBContext.Categories.First(c => c.Id == id);
            if (!parentCat.DepartmentIds.Contains(deptId))
            {
                parentCat.DepartmentIds.Add(deptId);
                _mapDBContext.SaveChanges();
            }
            if(parentCat.ParentId != null)
            {
                searchParentCategory(parentCat.ParentId, deptId);
            }
        }
        [HttpPost("Get/getRoadByCSV")]
        public async Task<IActionResult> getRoadByCSVInput(int departmentId)
        {
            // 找到所有符合的pipeline
            var allPipelines = await _mapDBContext.Pipelines
                .Where(c => c.DepartmentIds
                    .Contains(departmentId))
                .ToListAsync();
            var allCategory = await _mapDBContext.Categories
                .Where(c => c.DepartmentIds
                    .Contains(departmentId))
                .ToListAsync();

            if (allPipelines == null)
            {
                return null;
            }
            var pipelineSelectList = new List<SelectListItem>();
            buildPipelinePath(pipelineSelectList, allCategory, allPipelines, null, "");
            // 建立 SelectListItem
            var model = new AddRoadByCSVInput
            {
                Pipelines = pipelineSelectList
            };

            return Ok(new{ model});
        }

        private string buildCategoryPath(List<Category> allCategory, Guid? parentId)
        {
            var category = allCategory.FirstOrDefault(ac => ac.Id == parentId);
            if (category == null) return string.Empty;

            if (category.ParentId == null)
            {
                return category.Name;
            }
            return buildCategoryPath(allCategory, category.ParentId) + "/" + category.Name;
        }

        private void buildPipelinePath(List<SelectListItem> pipelineSelectList, List<Category> allCategory, List<Pipeline> allPipeline, Guid? parentId, string pathName)
        {
            var currentCategories = allCategory.Where(ac => ac.ParentId == parentId).OrderBy(ac => ac.OrderId).ToList();
            foreach(var category in currentCategories)
            {
                var pipelines = allPipeline.Where(ap => ap.CategoryId == category.Id).ToList();
                var next_path = pathName + "/" + category.Name;
                foreach (var pipeline in allPipeline)
                {
                    pipelineSelectList.Add(new SelectListItem
                    {
                        Text = next_path + "/" + pipeline.Name,
                        Value = pipeline.Id.ToString()
                    });
                }
                buildPipelinePath(pipelineSelectList, allCategory, allPipeline, category.Id, next_path);
            }
        }

        [HttpPost("Update/Category")]
        public async Task<IActionResult> UpdateCategoryAsync(Guid CateId, Guid newId)
        {
            try
            {
                var Category = await _mapDBContext.Categories.FirstAsync(c => c.Id == CateId);
                Category.ParentId = newId;
                await _mapDBContext.SaveChangesAsync();
                return Ok(new { success = true, message = "更新成功" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"更新失敗 {ex}" });
            }
        }

    }
}
