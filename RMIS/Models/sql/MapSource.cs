
namespace RMIS.Models.sql
{
    public class MapSource
    {
        public int Id { get; set; }          // 主鍵
        public string Url { get; set; }      // 地圖來源的 URL
        public string SourceId { get; set; }    // 地圖來源的圖層名稱
        public string Name { get; set; }     // 名稱
        public string Type { get; set; }     // 基本類型或疊加類型
        public string TileType { get; set; } // WTS 或 WMTS
        public string? ImageFormat { get; set; } // 圖片格式，例如 "image/png", "image/jpeg"，WMTS時可為 null
        public string Attribution { get; set; } // 地圖來源的歸屬信息
    }
}
