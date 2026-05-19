namespace RMIS.Models.API
{
    public class UpdateProjectInput
    {
        // 專案Id
        public int Id { get; set; }
        // 專案編號
        public string ProjectId { get; set; }
        // 提案人
        public string Proposer { get; set; }
        // 行政區
        public string AdministrativeDistrict { get; set; }
        // 起點
        public string StartPoint { get; set; }
        // 終點
        public string EndPoint { get; set; }
        // 起訖位置
        public string StartEndLocation { get; set; }
        // 道路長度
        public float RoadLength { get; set; }
        // 現況路寬
        public string CurrentRoadWidth { get; set; }
        // 計畫路寬
        public string PlannedRoadWidth { get; set; }
        // 公有土地數量
        public int PublicLand { get; set; }
        // 私有土地數量
        public int PrivateLand { get; set; }
        // 公私土地數量
        public int PublicPrivateLand { get; set; }
        // 工程經費（單位：萬元）
        public long ConstructionBudget { get; set; }
        // 用地經費（單位：萬元）
        public long LandAcquisitionBudget { get; set; }
        // 補償經費（單位：萬元）
        public long CompensationBudget { get; set; }
        // 合計經費（單位：萬元）
        public long TotalBudget { get; set; }
        // 審議年度
        public string ReviewYear { get; set; }
        // 案件類型
        public string CaseType { get; set; }
        // RC數量
        public string RCCount { get; set; }
        // 鐵皮屋數量
        public string TinHouseCount { get; set; }
        // 審議結果
        public string ReviewResult { get; set; }
        // 備註
        public string Remarks { get; set; }
        // 街景的 AreaId（null 表示不更新，保留原值）
        public Guid? StreetViewId { get; set; }
    }
}
