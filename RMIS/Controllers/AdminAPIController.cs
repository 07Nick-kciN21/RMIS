using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RMIS.Repositories;

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
                // 调用服务层进行删除操作
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
                // 捕获异常并返回错误
                return StatusCode(500, new { success = false, message = $"categoryId {categoryId} An error occurred while deleting.", error = ex.Message });
            }
        }

    }

}
