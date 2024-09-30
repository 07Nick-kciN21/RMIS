using RMIS.Models.RoadModel;
using RMIS.Models.sql;
namespace RMIS.Repositories
{
    public interface IRoadRepository
    {
        Task<Road> GetAsync(Guid id);
        Task<List<Road>> AllAsync();
        Task<Boolean> AddAsync(RoadClass.AddInput road);
        Task<Boolean> DeleteAsync(Guid id);
        Task<Boolean> UpdateAsync(Road road);
    }
}
