using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;
using RMIS.Models.sql;

namespace RMIS.Models.Admin
{
    public class AddPipelineInput
    {
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public string Color { get; set; } // 顏色
        [BindNever]
        public IEnumerable<SelectListItem> Categories { get; set; } // 類別
        public string CategoryId { get; set; }
        [BindNever]
        public IEnumerable<SelectListItem> GeometryTypes { get; set; }
        public string[] selectedGeometryTypes { get; set; }
        public IEnumerable<SelectListItem> Departments { get; set; }
        public List<int> selectedDepartmentIds { get; set; }
    }
}
