using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor;

namespace RMIS.ViewEngines
{
    public class CustomViewLocationExpander : IViewLocationExpander
    {
        public void PopulateValues(ViewLocationExpanderContext context)
        {
            // Do nothing
        }

        public IEnumerable<string> ExpandViewLocations(ViewLocationExpanderContext context, IEnumerable<string> viewLocations)
        {
            if(context.ControllerName == "Account")
            {
                return new string[]
                {
                    "/Views/Account/User/{0}.cshtml",
                    "/Views/Account/Role/{0}.cshtml",
                    "/Views/Account/Permission/{0}.cshtml",
                    "/Views/Account/Department/{0}.cshtml",
                };
            }
            if (context.ControllerName == "Mapdata")
            {
                return new string[]
                {
                    "/Views/Mapdata/General/{0}.cshtml",
                    "/Views/Mapdata/NotGeneral/{0}.cshtml",
                };
            }
            return viewLocations;
        }
    }
}
