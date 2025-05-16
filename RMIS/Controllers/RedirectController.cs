using Microsoft.AspNetCore.Mvc;

namespace RMIS.Controllers
{
    public class RedirectController : Controller
    {
        [HttpGet]
        public IActionResult Index(string target)
        {
            if (string.IsNullOrEmpty(target))
            {
                return Content("Missing target parameter.");
            }
            Console.WriteLine(target);
            ViewBag.EncodedTarget = target;
            return View();
        }
    }
}
