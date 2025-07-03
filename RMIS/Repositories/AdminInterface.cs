using Newtonsoft.Json.Linq;
using RMIS.Models.Account.Users;
using RMIS.Models.Admin;
using RMIS.Models.API;
using RMIS.Models.sql;
namespace RMIS.Repositories
{
    public interface AdminInterface
    {
        // Category (類別)
        Task<int> AddCategoryAsync(AddCategoryInput categoryInput);
        Task<(int categoryCount, int pipelineCount)> AddCategoryByJsonAsync(JObject jObject);
        Task<AddCategoryInput> getCategoryInput(UserAuthInfo userAuthInfo);
        Task<int> DeleteCategoryAsync(Guid? categoryId);

        // Pipeline (管線)
        Task<int> AddPipelineAsync(AddPipelineInput pipelineInput);
        Task<AddPipelineInput> getPipelineInput(UserAuthInfo userAuthInfo);
        Task<FlagPanelInput> GetFlaggedPipelinesAsync(UserAuthInfo userAuthInfo);
        Task<int> DeletePipelineAsync(Guid? pipelineId);

        // Road (道路)
        Task<int> AddRoadAsync(AddRoadInput roadInput);
        Task<int> AddRoadByCSVAsync(AddRoadByCSVInput roadByCSVInput);
        Task<AddRoadInput> getRoadInput(UserAuthInfo userAuthInfo);
        Task<AddRoadByCSVInput> getRoadByCSVInput(UserAuthInfo userAuthInfo);

        // Road Project (道路工程)
        Task<int> AddRoadProjectAsync(AddRoadProjectInput roadProjectInput);
        Task<(bool Success, string Message)> AddRoadProjectByExcelAsync(AddRoadProjectByExcelInput roadProjectByExcel);
        Task<List<RoadProject>> GetProjectByAsync(GetRoadProjectInput data);
        Task<PointsByProjectId> GetPointsByProjectIdAsync(Guid projectId);
        Task<Boolean> UpdateProjectDataAsync(UpdateProjectInput projectInput);
        Task<Boolean> UpdateProjectPhotoAsync(UpdateProjectPhotoInput projectPhotoInput);

        // Construct Notice (施工公告)
        Task<int> AddConstructNoticeByExcelAsync(AddConstructNoticeByExcelInput roadProjectByExcelInput);

        // Map Source (地圖來源)
        Task<int> AddMapSourceAsync(AddMapSourceInput mapsourceInput);

        // Focused Data (聚焦數據)
        Task<FocusedData> GetFocusDataAsync(GetFocusDataInput input);
        Task<List<LayersByFocusPipeline>> GetLayersByFocusPipelineAsync(int ofType);
        Task<AreasByLayer> GetAreasByFocusLayerAsync(GetAreasByFocusLayerInput AreasByFocusLayerInput);

        // Layer (圖層)
        Task<int> DeleteLayerDataAsync(Guid? layerId);
    }
}
