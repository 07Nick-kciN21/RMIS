using RMIS.Models.AreaModel;

namespace RMIS.Repositories
{
    public interface IAreaRepository
    {
        Task<Boolean> AddAsync(AreaClass.AddInput area);
    }
}
