using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RMIS.Models.sql;
using RMIS.Repositories;
using RMIS.Models.Admin;
using RMIS.Models.API;
using Microsoft.AspNetCore.Identity;
using RMIS.Models.Auth;


namespace RMIS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AdminAPIController : ControllerBase
    {

        private readonly AdminInterface _adminInterface;
        private readonly AccountInterface _accountInterface;
        private readonly UserManager<ApplicationUser> _userManager;

        public AdminAPIController(AdminInterface adminInterface, AccountInterface accountInterface, UserManager<ApplicationUser> userManager)
        {
            _adminInterface = adminInterface;
            _accountInterface = accountInterface;
            _userManager = userManager;
        }

        [HttpPost("deletePipeline")]
        public async Task<IActionResult> DeletePipeline(int pipelineId)
        {
            try
            {
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

        [HttpGet("deleteCategory")]
        public async Task<IActionResult> DeleteCategory(int? categoryId)
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
        public async Task<IActionResult> DeleteLayerData(int layerId)
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

    }
}
