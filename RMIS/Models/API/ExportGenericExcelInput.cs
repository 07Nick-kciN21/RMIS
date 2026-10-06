namespace RMIS.Models.API
{
    public class ExportGenericExcelInput
    {
        public List<string> Headers { get; set; } = new();
        public List<List<string>> Rows { get; set; } = new();
        public string? FileLabel { get; set; }
    }
}
