using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.RoadModel;
using RMIS.Models.sql;
using RMIS.Repositories;
namespace RMIS.Controllers
{
    public class RoadController : Controller
    {
        private readonly MapDBContext _Mapcontext;
        private readonly IRoadRepository _RoadRepository;

        public RoadController(MapDBContext Mapcontext, IRoadRepository roadRepository)
        {
            _Mapcontext = Mapcontext;
            _RoadRepository = roadRepository;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var roads = await _RoadRepository.AllAsync();
            return View(roads);
        }

        [HttpGet]
        public IActionResult Add()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Add(RoadClass.AddInput RoadInput)
        {
            if (await _RoadRepository.AddAsync(RoadInput))
            {
                Console.WriteLine("Road added successfully");
            }
            else
            {
                Console.WriteLine("Failed to add road"); 
            }
            return RedirectToAction("Index", "Road");
        }

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var roadList = await _RoadRepository.AllAsync();
            return View(roadList);
        }

        [HttpGet]
        public async Task<IActionResult> Edit(Guid id)
        {
            var road = await _RoadRepository.GetAsync(id);
            var Editroad = new RoadClass.EditInput
            {
                Id = road.Id,
                //City = road.City,
                //Town = road.Town,
                Name = road.Name,
            };
            return View(Editroad);
        }

        [HttpPost]
        public async Task<IActionResult> Edit(RoadClass.EditInput EditRoad)
        {
            var road = new Road
            {
                Id = EditRoad.Id,
                //City = EditRoad.City,
                //Town = EditRoad.Town,
                Name = EditRoad.Name,
            };

            if (await _RoadRepository.UpdateAsync(road))
            {
                Console.WriteLine("Road updated successfully");
            }
            else
            {
                Console.WriteLine("Failed to update road");
            }

            return RedirectToAction("Index", "Road");
        }

        [HttpPost]
        public async Task<IActionResult> Delete(Guid id)
        {
            return RedirectToAction("Index", "Home");
        }
    }
}
