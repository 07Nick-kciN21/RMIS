
namespace RMIS.Models.sql
{
    public class MapSource
    {
        public int Id { get; set; }          // 主鍵
        public string Url { get; set; }      // 地圖來源的 URL
        public string LayerName { get; set; } // 圖層名稱
        public string Type { get; set; } // 基本圖層or 疊加圖層
        public string ImageFormat { get; set; } // 圖片格式，例如 "image/png", "image/jpeg"
        public string Attribution { get; set; } // 地圖來源的歸屬信息
    }
}
