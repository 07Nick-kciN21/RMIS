namespace RMIS.Models.Admin
{
    public class AddRoadProjectInput
    {

        // 提案人
        public string? Proposer { get; set; }

        // 行政區
        public string? AdminDistrict { get; set; }
 
        // 起點
        public string? StartPoint { get; set; }

        // 終點
        public string? EndPoint { get; set; }

        // 道路長度
        public float RoadLength { get; set; }

        // 現況路寬
        public int? CurrentRoadWidth { get; set; }

        // 現況類別
        public string CurrentRoadType { get; set; }

        // 計畫路寬
        public int PlannedRoadWidth { get; set; }

        //計畫類別
        public string PlannedRoadType { get; set; }

        // 公有土地
        public int PublicLand { get; set; }

        // 私有土地
        public int PrivateLand { get; set; }

        // 公私土地
        public int PublicPrivateLand { get; set; }

        // 工程經費
        public int ConstructionBudget { get; set; }

        // 用地經費
        public int LandBudget { get; set; }

        // 補償經費
        public int CompensationBudget { get; set; }

        // 合計經費
        public int TotalBudget { get; set; }

        // 備註
        public string? Remark { get; set; }

        // 欲拓範圍
        public List<range> ExpansionRange { get; set; }
        // 街景照片
        public List<photo> StreetViewPhoto { get; set; }        
    }
    public class range
    {
        public int Id { get; set; } // 主鍵
        public double Latitude { get; set; } // 經度
        public double Longitude { get; set; } // 緯度
    }
    public class photo
    {
        public int Id { get; set; } // 序列
        public string Photo { get; set; } // 圖檔
        public string PhotoName { get; set; } // 圖片描述
        public double Latitude { get; set; } // 經度
        public double Longitude { get; set; } // 緯度
    }
}
