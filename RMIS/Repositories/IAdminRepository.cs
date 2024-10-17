using RMIS.Models.Admin;
namespace RMIS.Repositories
{

    public interface IAdminRepository
    {
        Task<Guid> AddPipeline(AddPipelineInput pipelineInput);
        Task<Guid> AddRoad(AddRoadInput roadInput);
        Task<Guid> AddCategory(AddCategoryInput categoryInput);
        Task<int> AddMapSource(AddMapSourceInput mapsourceInput);
    }
}
