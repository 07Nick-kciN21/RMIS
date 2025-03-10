﻿using Newtonsoft.Json.Linq;
using RMIS.Models.Admin;
using RMIS.Models.API;
using RMIS.Models.sql;
namespace RMIS.Repositories
{
    public interface AdminInterface
    {
        Task<AddPipelineInput> getPipelineInput(string department);
        Task<int> AddPipelineAsync(AddPipelineInput pipelineInput);
        Task<AddRoadInput> getRoadInput();
        Task<int> AddRoadAsync(AddRoadInput roadInput);
        Task<AddRoadByCSVInput> getRoadByCSVInput();
        Task<int> AddRoadByCSVAsync(AddRoadByCSVInput roadByCSVInput);
        Task<AddCategoryInput> getCategoryInput();
        Task<int> AddCategoryAsync(AddCategoryInput categoryInput);
        Task<int> AddMapSourceAsync(AddMapSourceInput mapsourceInput);
        Task<(int categoryCount, int pipelineCount)> AddCategoryByJsonAsync(JObject jObject);
        Task<int> DeletePipelineAsync(Guid? pipelineId);
        Task<int> DeleteLayerDataAsync(Guid? layerId);
        Task<int> DeleteCategoryAsync(Guid? categoryId);
        Task<List<string>> GetFlaggedPipelinesAsync();
        Task<FocusedData> GetFocusDataAsync(GetFocusDataInput input);
        Task<int> AddRoadProjectByExcelAsync(AddRoadProjectByExcelInput roadProjectByExcel);
        Task<List<RoadProject>> GetProjectByAsync(GetRoadProjectInput data);
        Task<PointsByProjectId> GetPointsByProjectIdAsync(Guid projectId);
        Task<int> AddRoadProjectAsync(AddRoadProjectInput roadProjectInput);
        Task<Boolean> UpdateProjectDataAsync(UpdateProjectInput projectInput);
        Task<Boolean> UpdateProjectPhotoAsync(UpdateProjectPhotoInput projectPhotoInput);
        Task<List<LayersByFocusPipeline>> GetLayersByFocusPipelineAsync(int ofType);
        Task<AreasByLayer> GetAreasByFocusLayerAsync(GetAreasByFocusLayerInput AreasByFocusLayerInput);
        Task<int> AddConstructNoticeByExcelAsync(AddConstructNoticeByExcelInput roadProjectByExcelInput);
    }
}
