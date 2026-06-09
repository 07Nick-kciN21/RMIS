using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    [Table("road_project_process_2")]
    public class RoadProjectProcess2
    {
        public int Id { get; set; }
        public string ProcessId { get; set; }
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
        /// 類別
        /// </summary>
        public string? Category { get; set; }

        /// <summary>
        /// 執行單位
        /// </summary>
        public string? ExecutionUnit { get; set; }

        /// <summary>
        /// 工程單位
        /// </summary>
        public string? ConstructionUnit { get; set; }

        /// <summary>
        /// 工程名稱
        /// </summary>
        public string? ProjectName { get; set; }

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
