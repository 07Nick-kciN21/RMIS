using Microsoft.AspNetCore.Mvc.Rendering;

namespace RMIS.Models.Admin
{
    public class AddRoadByCSVInput
    {
        public string ConstructionUnit { get; set; } // 施工單位
        public string PipelineId { get; set; }
        public IEnumerable<SelectListItem> Pipelines { get; set; }
        public string LayerId { get; set; }
        public IFormFile pileCsv { get; set; }
        public IFormFile roadCsv { get; set; }
    }
}
