namespace RMIS.Models.Admin
{
    public class ConstructNoticeExcelFormat
    {
        public Guid Id { get; set; }
        public string LicenseNumber { get; set; } // 許可證號
        public string ProjectNumber { get; set; } // 工程案號
        public string ApprovalUnit { get; set; } // 核定單位
        public string ProjectName { get; set; } // 工程名稱
        public string ConstructionStatus { get; set; } // 施工狀態
        public DateTime? ConstructionStartDate { get; set; } // 施工開始日期
        public DateTime? ConstructionEndDate { get; set; } // 施工結束日期
        public string AdministrativeDistrict { get; set; } // 行政區
        public string ConstructionLocation { get; set; } // 施工地點
        public string? DaytimeConstructionPeriod { get; set; } // 白天施工時段
        public string? NighttimeConstructionPeriod { get; set; } // 晚上施工時段
        public string? PipelineUnit { get; set; } // 管線單位
        public string? ConstructionReason { get; set; } // 施工原因
        public string? ChangeStatus { get; set; } // 變更狀態
        public DateTime? ChangeDate { get; set; } // 變更日期（允許為 null）
        public DateTime? CompletionDate { get; set; } // 結案日期（允許為 null）
        public string? BeforeConstructionPhoto { get; set; } // 施工前照片（可能是 URL 或路徑）
        public string? AfterConstructionPhoto { get; set; } // 施工後照片（可能是 URL 或路徑）
        public string? NoticePhoto { get; set; } // 打卡告示照片
        public string? TrafficControlPhoto { get; set; } // 打卡交管照片
        public string ConstructionScope { get; set; } // 施工範圍
        public string NoticePosition { get; set; } // 通報座標
        public Guid PositionId { get; set; } // 通報座標的 AreaId
    }

}
