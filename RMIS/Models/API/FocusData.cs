using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class FocusedData
    {
        public List<focusedCase>? FocusedRoad { get; set; }
        public List<focusedCase>? FocusedRange { get; set; }
    }

    public class focusedCase
    {
        
        public string date { get; set; }
        public string location { get; set; }
        public List<Point> points { get; set; }
    }
}
