namespace RMIS.Models.Admin
{
    public class AddConstructNoticeByExcelInput
    {
        public IFormFile noticeFile { get; set; }
        public List<IFormFile> noticePhoto { get; set; }
    }
}
