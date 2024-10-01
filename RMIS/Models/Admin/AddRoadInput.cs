using Microsoft.AspNetCore.Mvc.Rendering;
using RMIS.Models.sql;

namespace RMIS.Models.Admin
{
    public class AddRoadInput
    {
        public string Name { get; set; }
        public string ConstructionUnit { get; set; } // 施工單位
        public string Type { get; set; } // 類別
        public string AdminDistId { get; set; }
        public IEnumerable<SelectListItem> AdminDists { get; set; }
        public string PipelineId { get; set; }
        public IEnumerable<SelectListItem> Pipelines { get; set; }
        public string GeometryTypeId { get; set; }
        public IEnumerable<SelectListItem> GeometryTypes { get; set; }
        public string[] SelectedTypes { get; set; } = Array.Empty<string>();
        public List<Point> Points { get; set; }
    }
    public class GeometryTypeOption
    {
        public string Text { get; set; }
        public string Value { get; set; }
        public string ImageUrl { get; set; }
    }
}
