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
        Task<int> DeleteCategoryAsync(int? categoryId);

        // Pipeline (管線)
        Task<int> AddPipelineAsync(AddPipelineInput pipelineInput);
        Task<AddPipelineInput> getPipelineInput(UserAuthInfo userAuthInfo);
        Task<FlagPanelInput> GetFlaggedPipelinesAsync(UserAuthInfo userAuthInfo);
        Task<int> DeletePipelineAsync(int pipelineId);

        // Road (道路)
        Task<int> AddRoadAsync(AddRoadInput roadInput);
        Task<int> AddRoadByCSVAsync(AddRoadByCSVInput roadByCSVInput);
        Task<AddRoadInput> getRoadInput(UserAuthInfo userAuthInfo);
        Task<AddRoadByCSVInput> getRoadByCSVInput(UserAuthInfo userAuthInfo);

        // Road Project (道路工程)
        Task<int> AddRoadProjectAsync(AddRoadProjectInput roadProjectInput);
        Task<bool> DeleteRoadProjectAsync(int projectId);
        Task<ImportRoadProjectResult> ImportRoadProjectByExcelAsync(ImportRoadProjectByExcelInput input);
        Task<List<RoadProject>> GetProjectByAsync(GetRoadProjectInput data);
        Task<PointsByProjectId> GetPointsByProjectIdAsync(int projectId);
        Task<Boolean> UpdateProjectDataAsync(UpdateProjectInput projectInput);
        Task<Boolean> UpdateProjectPhotoAsync(UpdateProjectPhotoInput projectPhotoInput);
        Task<bool> UpdateProjectPointsAsync(int projectId, List<range> rangePoints, List<photo>? photoPoints);
        Task<bool> ConfirmCoordinateAsync(int projectId);

        // Construct Notice (施工公告)
        Task<int> AddConstructNoticeByExcelAsync(AddConstructNoticeByExcelInput roadProjectByExcelInput);

        // Map Source (地圖來源)
        Task<int> AddMapSourceAsync(AddMapSourceInput mapsourceInput);

        // Focused Data (聚焦數據)
        Task<FocusedData> GetFocusDataAsync(GetFocusDataInput input);
        Task<List<LayersByFocusPipeline>> GetLayersByFocusPipelineAsync(int ofType);
        Task<AreasByLayer> GetAreasByFocusLayerAsync(GetAreasByFocusLayerInput AreasByFocusLayerInput);

        // Layer (圖層)
        Task<int> DeleteLayerDataAsync(int layerId);

        // Accident (交通事故)
        Task<List<AccidentRecord>> GetAccidentDataAsync(AccidentQueryInput input);
        Task<List<AccidentRecord>> ExportAccidentDataAsync(int year, string area);
        Task<List<(string Lat, string Lng)>> GetAccidentPointsByMonthAsync(int minguo, int month);
        Task<int> SyncAccidentDataAsync(int minguo);
    }
}
