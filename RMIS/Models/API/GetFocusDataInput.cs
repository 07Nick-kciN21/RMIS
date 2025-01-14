namespace RMIS.Models.API
{
    public class GetFocusDataInput
    {
        public int FocusType { get; set; }
        // 時間戳 ex 1733011200000, 1738281600000
        public string FocusStartDate { get; set; }
        public string FocusEndDate { get; set; }
    }
}
