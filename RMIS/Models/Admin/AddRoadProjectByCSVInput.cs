namespace RMIS.Models.Admin
{
    public class AddRoadProjectByExcelInput
    {
        public IFormFile projectFile { get; set; }
        public List<IFormFile> projectPhoto { get; set; }
    }
}
