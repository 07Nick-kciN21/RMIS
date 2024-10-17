

namespace RMIS.Models.API
{
    public class IndexClass
    {
        public class LayersByPipeline
        {
            public string id { get; set; }
            public string name { get; set; }
            public string svg { get; set; }
        }

        // Layer下有多個Area
        public class AreasByLayer
        {
            public string id { get; set; }
            public string name { get; set; }
            public string color { get; set; }
            public string type { get; set; }
            public string svg { get; set; }
            public List<AreaDto> areas { get; set; }
        }
        // Area下有多個Point
        public class AreaDto
        {
            public string id { get; set; }
            public string ConstructionUnit { get; set; }
            public List<PointDto> points { get; set; }
        }
        public class PointDto
        {
            public int Index { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }

        public class LayerIdByPipeline
        {
            public List<string> LayerIdList { get; set; }
        }

        public class RoadbyName
        {
            public string Id { get; set; }
            public string Name { get; set; }
        }
        public class PointsbyId
        {
            public string Id { get; set; }
            public List<PointDto> Points { get; set; }
        }

        public class MapSourceOrderbyTileType
        {
            public List<MapSource> WMS { get; set; }
            public List<MapSource> WMTS { get; set; }
        }
        public class MapSource
        {
            public string Id { get; set; }
            public string Url { get; set; }      // 地圖來源的 URL
            public string SourceId { get; set; }    // 地圖來源的圖層名稱
            public string Name { get; set; }     // 名稱
            public string Type { get; set; }     // 基本類型或疊加類型
            public string? ImageFormat { get; set; } // 圖片格式，例如 "image/png", "image/jpeg"，WMTS時可為 null
            public string Attribution { get; set; } // 地圖來源的歸屬信息
        }
    }
}
