using Microsoft.AspNetCore.Mvc;
using RMIS.Data;
using RMIS.Models.sql;
using RMIS.Models.AreaModel;
using RMIS.Repositories;

namespace RMIS.Controllers
{
    public class AreaController : Controller
    {
        private MapDBContext _mapDBContext;
        private IAreaRepository _areaRepository;

        public AreaController(MapDBContext mapDBContext, IAreaRepository areaRepository)
        {
            _mapDBContext = mapDBContext;
            _areaRepository = areaRepository;
        }
        [HttpGet]
        public async Task<IActionResult> Index()
        {
            return View();
        }
        [HttpGet]
        public async Task<IActionResult> Add()
        {
            return View();
        }
        [HttpPost]
        public async Task<IActionResult> Add(AreaClass.AddInput AreaInput)
        {
            if(await _areaRepository.AddAsync(AreaInput))
            {
                Console.WriteLine("Add Success");
            }
            else
            {
                Console.WriteLine("Add Fail");
            }
            return RedirectToAction("Index", "Area");
        }
        public async Task<IActionResult> Edit() {
            return View();
        }
        public async Task<IActionResult> Delete() {
            return View();
        }
        public async Task<IActionResult> List() 
        {
            return View();
        }
    }
}
