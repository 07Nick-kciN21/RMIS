namespace RMIS.Models.Admin
{
    public class AddRoadProjectInput
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

        // 現況類別
        public string CurrentRoadType { get; set; }

        // 計畫路寬
        public int PlannedRoadWidth { get; set; }

        //計畫類別
        public string PlannedRoadType { get; set; }

        // 經費資料
        public int ProjectBudget { get; set; }

        // 用地經費
        public int LandBudget { get; set; }

        // 補償經費
        public int CompensationBudget { get; set; }

        // 合計經費範圍
        public int TotalBudgetRange { get; set; }

        // 欲拓範圍
        public List<expansionRange> ExpansionRange { get; set; }
        // 街景照片
        public List<photo> StreetViewPhoto { get; set; }        
    }
    public class photo
    {
        public int Id { get; set; } // 主鍵
        public IFormFile StreetView { get; set; } // 圖檔名稱
        public double Latitude { get; set; } // 經度
        public double Longitude { get; set; } // 緯度
    }

    public class expansionRange
    {
        public int Id { get; set; } // 主鍵
        public double Latitude { get; set; } // 經度
        public double Longitude { get; set; } // 緯度
    }
}
