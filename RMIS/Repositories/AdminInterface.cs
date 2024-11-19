using Newtonsoft.Json.Linq;
using RMIS.Models.Admin;
namespace RMIS.Repositories
{

    public interface AdminInterface
    {
        Task<AddPipelineInput> getPipelineInput();
        Task<int> AddPipelineAsync(AddPipelineInput pipelineInput);
        Task<AddRoadInput> getRoadInput();
        Task<int> AddRoadAsync(AddRoadInput roadInput);
        Task<AddRoadByCSVInput> getRoadByCSVInput();
        Task<int> AddRoadByCSVAsync(AddRoadByCSVInput roadByCSVInput);
        Task<AddCategoryInput> getCategoryInput();
        Task<int> AddCategoryAsync(AddCategoryInput categoryInput);
        Task<int> AddMapSourceAsync(AddMapSourceInput mapsourceInput);
        Task<int> AddCategoryByJsonAsync(JObject jObject);
        Task<int> DeletePipelineAndCategoryAsync(Guid? pipelineId, Guid? categoryId);
    }
}
