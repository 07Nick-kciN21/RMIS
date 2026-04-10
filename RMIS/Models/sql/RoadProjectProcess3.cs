using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    [Table("road_project_process_3")]
    public class RoadProjectProcess3
    {
        public int Id { get; set; }
        public Guid ProcessId { get; set; }
        public string ProjectId { get; set; }

        /// <summary>
        /// 項次 (同專案同階段的順序)
        /// </summary>
        public int OrderIndex { get; set; }

        /// <summary>
        /// 行政區
        /// </summary>
        public string? District { get; set; }
        /// <summary>
        /// 記錄類別
        /// </summary>
        public string? RecordType { get; set; }

        /// <summary>
        /// 記錄標題
        /// </summary>
        public string? RecordTitle { get; set; }

        /// <summary>
        /// 執行單位
        /// </summary>
        public string? ExecutionUnit { get; set; }

        /// <summary>
        /// 工程名稱
        /// </summary>
        public string? ProjectName { get; set; }
        /// <summary>
        /// 預算(年度)來源核定經費
        /// </summary>
        public string? BudgetFiscalYearApprovedAmount { get; set; }

        /// <summary>
        /// 開口合約/專業發包
        /// </summary>
        public string? ContractType { get; set; }

        /// <summary>
        /// 工期
        /// </summary>
        public string? ConstructionPeriod { get; set; }

        /// <summary>
        /// 上網公告預計/實際開工
        /// </summary>
        public string? AnnouncementCommencementDate { get; set; }

        /// <summary>
        /// 決標日期預計/實際完工
        /// </summary>
        public string? AwardCompletionDate { get; set; }

        /// <summary>
        /// 前次會議辦理情形
        /// </summary>
        public string? PreviousMeetingStatus { get; set; }

        /// <summary>
        /// 前次會議裁示
        /// </summary>
        public string? PreviousMeetingResolution { get; set; }

        /// <summary>
        /// 最新辦理情形
        /// </summary>
        public string? CurrentStatus { get; set; }

        /// <summary>
        /// 本次會議裁示
        /// </summary>
        public string? CurrentMeetingResolution { get; set; }

        /// <summary>
        /// 新增時間
        /// </summary>
        public DateTime? CreatedAt { get; set; }

        /// <summary>
        /// 佐證文件
        /// </summary>
        public string? SupportingDocument { get; set; }
    }
}
