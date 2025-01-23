namespace RMIS.Models.Admin
{
    public class AddConstructNoticeByExcelInput
    {
        public IFormFile constructNoticeFile { get; set; }
        public List<IFormFile> constructNoticePhoto { get; set; }
    }
}
