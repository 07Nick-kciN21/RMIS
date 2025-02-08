using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using System.Linq;
using System.Threading.Tasks;
using RMIS.Models.Auth;
using Microsoft.EntityFrameworkCore;

namespace RMIS.Controllers
{
    public class FeatureController : Controller
    {
        private readonly AuthDbContext _authDbContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public FeatureController(AuthDbContext authDbContext, UserManager<ApplicationUser> userManager)
        {
            _authDbContext = authDbContext;
            _userManager = userManager;
        }
    }
}
