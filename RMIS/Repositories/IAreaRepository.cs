using RMIS.Models.AreaModel;

namespace RMIS.Repositories
{
    public interface IAreaRepository
    {
        Task<AreaClass.View> GetAsync(Guid id);
        Task<List<AreaClass.View>> AllAsync();
        Task<Boolean> AddAsync(AreaClass.AddInput area);
        Task<Boolean> DeleteAsync(Guid id);
        Task<Boolean> UpdateAsync(AreaClass.View area);
    }
}
