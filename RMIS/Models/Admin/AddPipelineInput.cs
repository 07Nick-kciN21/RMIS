﻿using Microsoft.AspNetCore.Mvc.Rendering;
using RMIS.Models.sql;

namespace RMIS.Models.Admin
{
    public class AddPipelineInput
    {
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public string CategoryId { get; set; }
        public string Color { get; set; } // 顏色
        public IEnumerable<SelectListItem> Category { get; set; } // 類別
        public IEnumerable<SelectListItem> GeometryTypes { get; set; }
        public string[] selectedGeometryTypes { get; set; } =  Array.Empty<string>();

        //public IEnumerable<SelectListItem> PipelineSys { get; set; }
    }
}
