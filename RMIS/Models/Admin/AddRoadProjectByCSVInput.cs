namespace RMIS.Models.Admin
{
    public class AddRoadProjectByExcelInput
    {
        public List<ImportMapdataArea>? ImportMapdataAreas { get; set; }
        public IFormFile projectFile { get; set; }
        public List<IFormFile> projectPhoto { get; set; }
        public Dictionary<string, List<PhotoFile>>? PhotoUploadData { get; set; }
    }
    // 照片檔案資料結構
    public class PhotoFile
    {
        public string Name { get; set; }
        public long Size { get; set; }
        public string Type { get; set; }
        public string Base64Data { get; set; } // Base64 圖片資料
        public DateTime UploadTime { get; set; }
    }
    public class ImportMapdataArea
    {
        public string name { get; set; }
        public string adminDist { get; set; }
        public List<MapdataPoint> MapdataPoints { get; set; }
    }
    public class MapdataPoint
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int Index { get; set; }
        public string? Property { get; set; }
    }
}
