namespace RMIS.Models.sql
{
    public class RoadProjectRemarkFile
    {
            public int Id { get; set; }
            public int ProjectId { get; set; }
            public string FileType { get; set; }
            public string FileName { get; set; }
            public string Base64String { get; set; }
            public string UploadUser { get; set; }
            public string FileSize { get; set; }
    }
}
