using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class FocusedData
    {
        
        public List<focusedCase>? FocusedRoad { get; set; }
        public List<focusedCase>? FocusedRange { get; set; }
        public List<noticeCase>? Construct { get; set; }
    }

    

    public class focusedCase
    {
        // 施工通報許可證號
        public string licenseNumber { get; set; }
        public string date { get; set; }
        public string location { get; set; }
        public string caseType { get; set; }
        public string reason { get; set; }
        public List<Point> points { get; set; }
    }
    public class noticeCase
    {
        // 施工通報許可證號
        public string licenseNumber { get; set; }
        // 日期
        public string date { get; set; }
        // 地點
        public string location { get; set; }
        // 類別
        public string caseType { get; set; }
        // 臨時道路租借事由
        public string reason { get; set; }
        public List<Point> points { get; set; }
    }
}
