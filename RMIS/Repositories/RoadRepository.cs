using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.sql;
using RMIS.Models.RoadModel;

namespace RMIS.Repositories
{
    public class RoadRepository : IRoadRepository
    {
        private readonly MapDBContext _mapDBContext;

        public RoadRepository(MapDBContext mapDBcontext)
        {
            _mapDBContext = mapDBcontext;
        }

        public async Task<bool> AddAsync(RoadClass.AddInput road)
        {
            try
            {
                Guid road_id = Guid.NewGuid();
                foreach (var point in road.Points)
                {
                    var new_point = new Point
                    {
                        Id = Guid.NewGuid(),
                        RoadId = road_id,
                        Index = point.Index,
                        Latitude = point.Latitude,
                        Longitude = point.Longitude
                    };
                    await _mapDBContext.Points.AddAsync(new_point);
                }
                var new_road = new Road
                {
                    Id = road_id,
                    //City = road.City,
                    //Town = road.Town,
                    Name = road.Name
                };
                await _mapDBContext.Roads.AddAsync(new_road);
                await _mapDBContext.SaveChangesAsync();
                Console.WriteLine("Road added successfully");
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<List<Road>> AllAsync()
        {
            return await _mapDBContext.Roads.ToListAsync();
        }

        public Task<bool> DeleteAsync(Guid id)
        {
            throw new NotImplementedException();
        }

        public async Task<Road> GetAsync(Guid id)
        {
            return await _mapDBContext.Roads.FindAsync(id);
        }

        public async Task<bool> UpdateAsync(Road newroad)
        {
            try
            {
                var road = await _mapDBContext.Roads.FindAsync(newroad.Id);
                if(road == null)
                {
                    return false;
                }
                //road.City = newroad.City;
                //road.Town = newroad.Town;
                road.Name = newroad.Name;
               
                await _mapDBContext.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
