namespace RMIS.Models.Admin
{
    public class GetRoadProjectInput
    {
        // ��F��
        public string? AdminDistrict { get; set; }

        // �_�I
        public string? StartPoint { get; set; }

        // ���I
        public string? EndPoint { get; set; }

        // �D������
        public int? RoadLength { get; set; }

        // �{�p���e
        public int? CurrentRoadWidth { get; set; }

        // �p�e���e
        public int? PlannedRoadWidth { get; set; }

        // �g�O���
        public BudgetInfo? Budgets { get; set; }
    }

    // �l���� BudgetInfo�A�Ω�B�z�g�O�������
    public class BudgetInfo
    {
        // �u�{�g�O
        public BudgetOption? ProjectBudget { get; set; }

        // �Φa�g�O
        public BudgetOption? LandBudget { get; set; }

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