using CsvHelper.Configuration;
using System.ComponentModel.DataAnnotations.Schema;
namespace RMIS.Models.sql
{
    public class RoadProject
    {
        public int Id { get; set; }
        public string? ProjectId { get; set; }

        /// 提案人
        public string? Proposer { get; set; }
        /// 行政區
        public string? AdministrativeDistrict { get; set; }
        /// 起點
        public string? StartPoint { get; set; }
        /// 終點
        public string? EndPoint { get; set; }
        /// 起訖位置
        public string? StartEndLocation { get; set; }
        /// 道路長度
        public string? RoadLength { get; set; }
        /// 現況路寬
        public string? CurrentRoadWidth { get; set; }
        /// 計畫路寬
        public string? PlannedRoadWidth { get; set; }
        /// 公有土地數量
        public string? PublicLand { get; set; }
        /// 私有土地數量
        public string? PrivateLand { get; set; }
        /// 公私土地數量
        public string? PublicPrivateLand { get; set; }
        /// 工程經費（單位：萬元）
        public int? ConstructionBudget { get; set; }
        /// 用地經費（單位：萬元）
        public int? LandAcquisitionBudget { get; set; }
        /// 補償經費（單位：萬元）
        public int? CompensationBudget { get; set; }
        /// 合計經費（單位：萬元）
        public int? TotalBudget { get; set; }
        /// 備註
        public string? Remarks { get; set; }
        /// <summary>
        /// 審議年度
        /// </summary>
        public string? ReviewYear { get; set; }

        /// <summary>
        /// 案件類型
        /// </summary>
        public string? CaseType { get; set; }

        /// <summary>
        /// 工程名稱
        /// </summary>
        public string? ProjectName { get; set; }

        /// <summary>
        /// RC數量(棟)
        /// </summary>
        public string? RCCount { get; set; }

        /// <summary>
        /// 鐵皮屋數量(棟)
        /// </summary>
        public string? TinHouseCount { get; set; }

        /// <summary>
        /// 審議結果
        /// </summary>
        public string? ReviewResult { get; set; }
        // 預拓範圍的AreaId
        public int? PlannedExpansionId { get; set; }
        // 街景的AreaId
        public int? StreetViewId { get; set; }
        // 新增時間
        public DateTime? CreateTime { get; set; }
        // 最後更新時間
        public DateTime? UpdateTime { get; set; }
        /// <summary>
        /// 座標是否已確認（透過 OpenStreetMap 自動取得的座標預設為 false）
        /// </summary>
        public bool? CoordinateChecked { get; set; }

        /// <summary>
        /// 建立者 (ApplicationUser.Id)，只有建立者本人可編輯/刪除此專案
        /// </summary>
        public string? CreatedByUserId { get; set; }

        /// <summary>
        /// 目前登入者是否為建立者（或無建立者紀錄的舊資料），由 API 於查詢時計算，不寫入資料庫
        /// </summary>
        [NotMapped]
        public bool IsOwner { get; set; }

    }
}
