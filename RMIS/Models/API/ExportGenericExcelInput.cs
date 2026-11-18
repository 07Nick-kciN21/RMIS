namespace RMIS.Models.API
{
    public class ExportGenericExcelInput
    {
        public List<string> Headers { get; set; } = new();
        public List<List<string>> Rows { get; set; } = new();
        public string? FileLabel { get; set; }

        /// <summary>
        /// 本次匯出涵蓋的專案編號；提供時會在每個專案的歷程中新增一筆「歷程匯出」記錄，標註本次匯出的補充碼
        /// </summary>
        public List<string>? ProjectIds { get; set; }
    }
}
