using Microsoft.AspNetCore.Mvc.Rendering;

namespace RMIS.Models.Account.Mapdatas
{
    public class MapdataManager
    {
        public List<PipelineData> PipelineDatas { get; set; }
    }

    public class PipelineData
    {
        public Guid Id { get; set; }
        public string? Category { get; set; }
        public string Name { get; set; }
        public bool IsGeneralPipeline { get; set; }
    }
    public class MapdataLayer
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }

    public class MapdataSearch
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Dist { get; set; }
        public string Kind { get; set; }
        public string Svg { get; set; }
        public string Color { get; set; }
        public List<MapdataArea> Areas { get; set; }
    }
    public class MapdatAdminDist
    {
        public Guid Id { get; set; }
        public int orderId { get; set; }
        public string City { get; set; }
        public string Town { get; set; }
    }

    public class MapdataArea
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }

    public class MapdataPoint
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int Index { get; set; }
        public string? Property { get; set; }
    }

    public class ImportMapdataView
    {
        public Guid LayerId { get; set; } // 圖層Id
        public string LayerName { get; set; } // 圖層名稱
        public string LayerKind { get; set; } // 圖層類型
        public string LayerSvg { get; set; } // 圖層標記
        public string LayerColor { get; set; } // 圖層顏色
        public string District { get; set; } // 行政區
        public string ImportSetting { get; set; } // 匯入設定
        public List<ImportMapdataArea>? ImportMapdataAreas { get; set; }
        public IFormFile Xlsx_or_Kml { get; set; }
    }

    public class ImportMapdataArea
    {
        public string name { get; set; }
        public List<MapdataPoint> MapdataPoints { get; set; }
    }
    public class UpdatePipelineView
    {
        public Guid Id { get; set; }
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public Guid CategoryId { get; set; } // 類別Id
        public IEnumerable<SelectListItem> Categories { get; set; }
        public bool Status { get; set; }
    }

    public class UpdatePipeline
    {
        public Guid Id { get; set; }
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public Guid CategoryId { get; set; } // 類別Id
    }

    public class UpdateDatainfo
    {
        public Guid Id { get; set; }
        public string Datainfo { get; set; }
    }
}
