using System.ComponentModel.DataAnnotations.Schema;

namespace RMIS.Models.sql
{
    [Table("road_project_process")]
    public class RoadProjectProcess
    {
        public int Id { get; set; }
        public Guid ProcessId { get; set; }
        public string ProjectId { get; set; }

        /// <summary>
        /// 項次（同專案的順序）
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
        /// 執行單位（Step 1、2）
        /// </summary>
        public string? ExecutionUnit { get; set; }

        /// <summary>
        /// 工程單位（Step 1、2）
        /// </summary>
        public string? ConstructionUnit { get; set; }

        /// <summary>
        /// 類別（Step 2）
        /// </summary>
        public string? Category { get; set; }

        /// <summary>
        /// 公聽會（Step 2）
        /// </summary>
        public string? PublicHearing { get; set; }

        /// <summary>
        /// 徵收市價地評會審查（Step 2）
        /// </summary>
        public string? MarketPriceReview { get; set; }

        /// <summary>
        /// 協議價購會（Step 2）
        /// </summary>
        public string? NegotiatedPurchaseMeeting { get; set; }

        /// <summary>
        /// 徵收計畫書地政局預審（Step 2）
        /// </summary>
        public string? ExpropriationPlanPreReview { get; set; }

        /// <summary>
        /// 徵收計劃書報部（Step 2）
        /// </summary>
        public string? ExpropriationPlanSubmission { get; set; }

        /// <summary>
        /// 徵收核定（Step 2）
        /// </summary>
        public string? ExpropriationApproval { get; set; }

        /// <summary>
        /// 工程名稱
        /// </summary>
        public string? ProjectName { get; set; }

        /// <summary>
        /// 預算(年度)來源核定經費（Step 3）
        /// </summary>
        public string? BudgetFiscalYearApprovedAmount { get; set; }

        /// <summary>
        /// 開口合約/專業發包（Step 3）
        /// </summary>
        public string? ContractType { get; set; }

        /// <summary>
        /// 工期（Step 3）
        /// </summary>
        public string? ConstructionPeriod { get; set; }

        /// <summary>
        /// 上網公告預計/實際開工（Step 3）
        /// </summary>
        public string? AnnouncementCommencementDate { get; set; }

        /// <summary>
        /// 決標日期預計/實際完工（Step 3）
        /// </summary>
        public string? AwardCompletionDate { get; set; }

        /// <summary>
        /// 設計派工（Step 3）
        /// </summary>
        public string? DesignDispatch { get; set; }

        /// <summary>
        /// 基設核定（Step 3）
        /// </summary>
        public string? BasicDesignApproval { get; set; }

        /// <summary>
        /// 細設核定（Step 3）
        /// </summary>
        public string? DetailedDesignApproval { get; set; }

        /// <summary>
        /// 工程施做（Step 3）
        /// </summary>
        public string? ConstructionExecution { get; set; }

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
        /// 用地經費
        /// </summary>
        public int? LandAcquisitionBudget { get; set; }

        /// <summary>
        /// 工程經費
        /// </summary>
        public int? ConstructionBudget { get; set; }

        /// <summary>
        /// 佐證文件
        /// </summary>
        public string? SupportingDocument { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public string? Proposer { get; set; }
    }
}
