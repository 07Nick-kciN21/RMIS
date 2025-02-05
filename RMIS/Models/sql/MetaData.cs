using System.ComponentModel.DataAnnotations;

namespace RMIS.Models.sql
{
    public class MetaData
    {
        public Guid Id { get; set; } // 唯一識別碼
        // 圖資編號
        public string? DataId { get; set; }

        // 圖資名稱 (必填)
        [Required]
        public string Name { get; set; } = string.Empty;

        // 圖資發布位置
        public string? ReleaseLocation { get; set; }

        // 轉製單位
        public string? ConversionUnit { get; set; }

        // 圖層覆蓋率
        public string? LayerCoverage { get; set; }

        // 更新頻率
        public string? UpdateFrequency { get; set; }

        // 上架時間
        public DateTime? ReleaseDate { get; set; }

        // 供應單位
        public string? ProvidingUnit { get; set; }

        // 圖資聯絡人
        public string? DataContactPerson { get; set; }

        // 連絡電話
        public string? ContactPhoneNumber { get; set; }

        // 聯絡人電子郵件
        public string? ContactEmail { get; set; }

        // 圖資摘要
        public string? DataSummary { get; set; }

        // 參考系統資訊
        public string? ReferenceSystemInfo { get; set; }

        // 詮釋資料更新時間
        public DateTime? MetadataUpdateTime { get; set; }

        // 圖資類型
        public string? DataType { get; set; }

        // 顯示比例尺
        public string? DisplayScale { get; set; }
    }

}
