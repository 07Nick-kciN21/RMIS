namespace RMIS.Models.API
{
    public class GetFocusDataInput
    {
        public int FocusType { get; set; }
        // 時間 ex 2024/12/3, 2024/12/4
        public DateTime FocusStartDate { get; set; }
        public DateTime FocusEndDate { get; set; }
    }
}
