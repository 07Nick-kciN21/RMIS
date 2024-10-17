using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using RMIS.Data;
using RMIS.Models.Admin;
using RMIS.Models.sql;
using RMIS.Repositories;

namespace RMIS.Controllers
{
    public class AdminController : Controller
    {
        private readonly AdminInterface _adminInterface;

        public AdminController(AdminInterface adminInterface)
        {
            _adminInterface = adminInterface;
        }

        [HttpGet]
        public IActionResult AddSystem()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> AddPipeline()
        {
            var input = await _adminInterface.getPipelineInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddPipeline(AddPipelineInput pipelineInput)
        {
            var rowsAffected = await _adminInterface.AddPipelineAsync(pipelineInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddPipeline", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddPipeline", "Admin");
        }

        
        [HttpGet]
        public async Task<IActionResult> AddRoad()
        {
            var input = await _adminInterface.getRoadInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddRoad(AddRoadInput roadInput)
        {
            var rowsAffected = await _adminInterface.AddRoadAsync(roadInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddRoad", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddRoad", "Admin");
        }

        [HttpGet]
        public async Task<IActionResult> AddCategory()
        {
            var input = await _adminInterface.getCategoryInput();
            return View(input);
        }

        [HttpPost]
        public async Task<IActionResult> AddCategory(AddCategoryInput categoryInput)
        {
            var rowsAffected = await _adminInterface.AddCategoryAsync(categoryInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddCategory", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddCategory", "Admin");
        }

        [HttpGet]
        public IActionResult AddMapSource()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> AddMapSource(AddMapSourceInput mapsourceInput)
        {
            var rowsAffected = await _adminInterface.AddMapSourceAsync(mapsourceInput);

            if (rowsAffected > 0)
            {
                return RedirectToAction("AddMapSource", "Admin");
            }
            else
            {
                Console.WriteLine("No changes were made to the database.");
            }

            return RedirectToAction("AddMapSource", "Admin");
        }
    }
}