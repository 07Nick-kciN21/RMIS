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
        public async Task<IActionResult> DeletePipeline(Guid? pipelineId)
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

        [HttpPost("updateProjectData")]
        public async Task<IActionResult> UpdateProjectData([FromForm] UpdateProjectInput projectData)
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                // 檢查權限
                var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "專案查詢");

                if (!currentUserPermission.Update)
                {
                    return Ok(new { success = false, message = "無權限更新資料" });
                }
                var updated = await _adminInterface.UpdateProjectDataAsync(projectData);
                if (updated)
                {
                    return Ok(new { success = true, message = "資料已更新" });
                }
                else
                {
                    return BadRequest(new { success = false, message = "資料未更新" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("updateProjectPhoto")]
        public async Task<IActionResult> UpdateProjectPhoto([FromForm] UpdateProjectPhotoInput projectPhoto)
        {
            try
            {
                var currentUser = await _userManager.GetUserAsync(User);
                // 檢查權限
                var currentUserPermission = await _accountInterface.GetUserPermission(currentUser.Id, "專案查詢");

                if (!currentUserPermission.Update)
                {
                    return Ok(new { success = false, message = "無權限更新照片" });
                }
                var updated = await _adminInterface.UpdateProjectPhotoAsync(projectPhoto);
                if (updated)
                {
                    return Ok(new { success = true, message = "照片已更新" });
                }
                else
                {
                    return BadRequest(new { success = false, message = "照片更新失敗" });
                }
            }
            catch
            {
                return StatusCode(500, new { success = false, message = "照片未更新" });
            }
        }
    }
}
