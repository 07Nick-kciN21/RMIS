namespace RMIS.Models.Admin
{
    public class GetRoadProjectInput
    {
        // 行政區
        public string? AdminDistrict { get; set; }

        // 起點
        public string? StartPoint { get; set; }

        // 終點
        public string? EndPoint { get; set; }

        // 道路長度
        public int? RoadLength { get; set; }

        // 現況路寬
        public int? CurrentRoadWidth { get; set; }

        // 計畫路寬
        public int? PlannedRoadWidth { get; set; }

        // 經費資料
        public BudgetInfo? Budgets { get; set; }
    }

    // 子物件 BudgetInfo，用於處理經費相關資料
    public class BudgetInfo
    {
        // 工程經費
        public BudgetOption? ProjectBudget { get; set; }

        // 用地經費
        public BudgetOption? LandBudget { get; set; }

        // 補償經費
        public BudgetOption? CompensationBudget { get; set; }

        // 合計經費範圍
        public BudgetRange? TotalBudgetRange { get; set; }
    }

    // 比較選項資料
    public class BudgetOption
    {
        public string? Option { get; set; } // 比較運算符號，例如 "大於"、"小於"
        public int? Value { get; set; }  // 對應的數值
    }

    // 範圍資料
    public class BudgetRange
    {
        public int? Start { get; set; } // 範圍起始值
        public int? End { get; set; }   // 範圍結束值
    }

}