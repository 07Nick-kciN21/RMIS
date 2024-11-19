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


        [HttpPost("delete")]
        public async Task<IActionResult> DeleteCategoryOrPipeline(Guid? pipelineIdToDelete, Guid? categoryIdToDelete)
        {
            try
            {
                // 调用服务层进行删除操作
                var rowsAffected = await _adminInterface.DeletePipelineAndCategoryAsync(
                    pipelineId: pipelineIdToDelete,
                    categoryId: categoryIdToDelete
                );

                if (rowsAffected > 0)
                {
                    return Ok(new { success = true, message = "Deleted successfully", rowsAffected });
                }
                else
                {
                    return NotFound(new { success = false, message = $"categoryId {categoryIdToDelete} or pipelineId {pipelineIdToDelete} No matching records found to delete" });
                }
            }
            catch (Exception ex)
            {
                // 捕获异常并返回错误
                return StatusCode(500, new { success = false, message = $"categoryId {categoryIdToDelete} or pipelineId {pipelineIdToDelete} An error occurred while deleting.", error = ex.Message });
            }
        }

    }

}
