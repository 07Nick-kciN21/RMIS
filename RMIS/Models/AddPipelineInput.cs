using Microsoft.AspNetCore.Mvc.Rendering;
using RMIS.Models.sql;

namespace RMIS.Models
{
    public class AddPipelineInput
    {
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public string CategoryId { get; set; }
        public string Color { get; set; } // 顏色
        public string PipelineSysId { get; set; } // 管線系統 ID
        public IEnumerable<SelectListItem> Category { get; set; } // 類別
        //public IEnumerable<SelectListItem> PipelineSys { get; set; }
    }
}
