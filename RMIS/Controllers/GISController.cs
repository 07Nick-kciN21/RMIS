using Microsoft.AspNetCore.Mvc;

namespace RMIS.Controllers
{
    public class GISController : Controller
    {
        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }
    }
}
