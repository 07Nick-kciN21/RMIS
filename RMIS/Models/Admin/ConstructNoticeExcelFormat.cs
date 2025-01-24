namespace RMIS.Models.Admin
{
    public class ConstructNoticeExcelFormat
    {
        public string LicenseNumber { get; set; }
        public string ProjectNumber { get; set; }
        public string ApprovalUnit { get; set; }
        public string ProjectName { get; set; }
        public string ConstructionStatus { get; set; }
        public DateTime ConstructionStartDate { get; set; }
        public DateTime ConstructionEndDate { get; set; }
        public string ConstructionDate { get; set; }
        public string ConstructionLocation { get; set; }
    }
}
