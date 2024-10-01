using Microsoft.AspNetCore.Mvc.Rendering;
using RMIS.Models.sql;

namespace RMIS.Models.Admin
{
    public class AddCategoryInput
    {
        public string Name { get; set; }
        public string ParentId { get; set; }
        public IEnumerable<SelectListItem> parentCategories { get; set; }
    }
}
