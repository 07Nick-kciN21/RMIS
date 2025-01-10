namespace RMIS.Models.API
{
    public class UpdateProjectInput
    {
        // 專案Id
        public Guid Id { get; set; }
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
        public int ConstructionBudget { get; set; }
        // 用地經費（單位：萬元）
        public int LandAcquisitionBudget { get; set; }
        // 補償經費（單位：萬元）
        public int CompensationBudget { get; set; }
        // 合計經費（單位：萬元）
        public int TotalBudget { get; set; }
        // 備註
        public string Remarks { get; set; }
    }
}
