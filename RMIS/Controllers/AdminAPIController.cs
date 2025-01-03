using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RMIS.Models.sql;
using RMIS.Repositories;
using RMIS.Models.Admin;

namespace RMIS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminAPIController : ControllerBase
    {

        private readonly AdminInterface _adminInterface;

        public AdminAPIController(AdminInterface adminInterface)
        {
            _adminInterface = adminInterface;
        }

        [HttpPost("deletePipeline")]
        public async Task<IActionResult> DeletePipeline(Guid? pipelineId)
        {
            try
            {
                // 调用服务层进行删除操作
                var rowsAffected = await _adminInterface.DeletePipelineAsync(
                    pipelineId: pipelineId
                );

                if (rowsAffected > 0)
                {
                    return Ok(new { success = true, message = "Deleted successfully", rowsAffected });
                }
                else
                {
                    return NotFound(new { success = false, message = $"pipelineId {pipelineId} No matching records found to delete" });
                }
            }
            catch (Exception ex)
            {
                // 捕获异常并返回错误
                return StatusCode(500, new { success = false, message = $"pipelineId {pipelineId} An error occurred while deleting.", error = ex.Message });
            }
        }

        [HttpPost("deleteCategory")]
        public async Task<IActionResult> DeleteCategory(Guid? categoryId)
        {
            try
            {
                var rowsAffected = await _adminInterface.DeleteCategoryAsync(
                    categoryId: categoryId
                );

                if (rowsAffected > 0)
                {
                    return Ok(new { success = true, message = "Deleted successfully", rowsAffected });
                }
                else
                {
                    return NotFound(new { success = false, message = $"categoryId {categoryId} No matching records found to delete" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"categoryId {categoryId} An error occurred while deleting.", error = ex.Message });
            }
        }

        [HttpPost("deleteLayer")]
        public async Task<IActionResult> DeleteLayerData(Guid? layerId)
        {
            try
            {
                var rowsAffected = await _adminInterface.DeleteLayerDataAsync(
                    layerId: layerId
                );

                if (rowsAffected > 0)
                {
                    return Ok(new { success = true, message = "Deleted successfully", rowsAffected });
                }
                else
                {
                    return NotFound(new { success = false, message = $"layerDataId {layerId} No matching records found to delete" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"layerDataId {layerId} An error occurred while deleting.", error = ex.Message });
            }
        }
        [HttpPost("getFlaggedPipelines")]
        public async Task<IActionResult> GetFlaggedPipelines()
        {
            try
            {
                var pipelines = await _adminInterface.GetFlaggedPipelinesAsync();

                if (pipelines != null)
                {
                    return Ok(new { success = true, pipelines });
                }
                else
                {
                    return NotFound(new { success = false, message = "No flagged pipelines found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching flagged pipelines.", error = ex.Message });
            }
        }

        // selectType：道路借用類型
        [HttpPost("getFocusedPipelines")]
        public async Task<IActionResult> GetFocusedPipelines(int selectType)
        {
            try
            {
                var pipelines = await _adminInterface.GetFocusedPipelinesAsync(selectType);

                if (pipelines != null)
                {
                    return Ok(new { success = true, pipelines });
                }
                else
                {
                    return NotFound(new { success = false, message = "No focused pipelines found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching focused pipelines.", error = ex.Message });
            }
        }

        [HttpPost("addProjectByCSV")]
        public async Task<IActionResult> AddRoadByCSV([FromForm] IFormFile file)
        {
            try
            {
                var rowsAffected = await _adminInterface.AddRoadRrojectByCSVAsync(file);

                if (rowsAffected > 0)
                {
                    return Ok(new { success = true, message = "Added successfully", rowsAffected });
                }
                else
                {
                    return BadRequest(new { success = false, message = "No records added" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while adding records.", error = ex.Message });
            }
        }

        [HttpPost("getRoadProjectByBudget")]
        public async Task<IActionResult> GetRoadProjectByBudget([FromBody] getRoadProjectInput data)
        {
            try
            {
                var roadProjects = await _adminInterface.GetProjectByAsync(data);
                // return Ok(new { success = true, data });
                if (roadProjects != null)
                {
                    return Ok(new { success = true, roadProjects });
                }
                else
                {
                    return NotFound(new { success = false, message = "No road projects found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching road projects.", error = ex.Message });
            }
        }

        [HttpPost("getPointsByProjectId")]
        public async Task<IActionResult> GetPointsByProjectId(Guid projectId)
        {
            try
            {
                var points = await _adminInterface.GetPointsByProjectIdAsync(projectId);

                if (points != null)
                {
                    return Ok(new { success = true, points });
                }
                else
                {
                    return NotFound(new { success = false, message = "No points found" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while fetching points.", error = ex.Message });
            }
        }

    }
}
