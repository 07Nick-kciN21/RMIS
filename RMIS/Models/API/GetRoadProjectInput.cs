namespace RMIS.Models.API
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

        // 經費資訊
        public BudgetInfo? Budgets { get; set; }
    }

    // �l���� BudgetInfo�A�Ω�B�z�g�O�������
    public class BudgetInfo
    {
        // �u�{�g�O
        public BudgetOption? ConstructionBudget { get; set; }

        // �Φa�g�O
        public BudgetOption? LandAcquisitionBudget { get; set; }

        // ���v�g�O
        public BudgetOption? CompensationBudget { get; set; }

        // �X�p�g�O�d��
        public BudgetRange? TotalBudgetRange { get; set; }
    }

    // ����ﶵ���
    public class BudgetOption
    {
        public string? Option { get; set; } // ����B��Ÿ��A�Ҧp "�j��"�B"�p��"
        public int? Value { get; set; }  // �������ƭ�
    }

    // �d����
    public class BudgetRange
    {
        public int? Start { get; set; } // �d��_�l��
        public int? End { get; set; }   // �d�򵲧���
    }

}