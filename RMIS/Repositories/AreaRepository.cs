using RMIS.Data;
using RMIS.Models.AreaModel;
using RMIS.Models.sql;

namespace RMIS.Repositories
{
    public class AreaRepository : IAreaRepository
    {
        private MapDBContext _mapDBContext;
        public AreaRepository(MapDBContext mapDBContext)
        {
            _mapDBContext = mapDBContext;
        }

        public async Task<bool> AddAsync(AreaClass.AddInput area)
        {
            try
            {
                Guid area_id = Guid.NewGuid();
                foreach (var point in area.Points)
                {
                    var new_point = new Point
                    {
                        Id = Guid.NewGuid(),
                        Index = point.Index,
                        Latitude = point.Latitude,
                        Longitude = point.Longitude
                    };
                    await _mapDBContext.Points.AddAsync(new_point);
                }
                var new_area = new Area
                {
                    Id = area_id,
                    Name = area.Name
                };
                await _mapDBContext.Areas.AddAsync(new_area);
                await _mapDBContext.SaveChangesAsync();
                Console.WriteLine("Area added successfully");
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return false;
            }
        }

    }
}
