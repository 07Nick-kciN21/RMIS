namespace RMIS.Models.API
{
    public class ExportRoadProjectExcelRow
    {
        public string? Proposer { get; set; }
        public string? AdministrativeDistrict { get; set; }
        public string? StartEndLocation { get; set; }
        public string? RoadLength { get; set; }
        public string? CurrentRoadWidth { get; set; }
        public string? PlannedRoadWidth { get; set; }
        public string? PublicLand { get; set; }
        public string? PrivateLand { get; set; }
        public string? PublicPrivateLand { get; set; }
        public int? ConstructionBudget { get; set; }
        public int? LandAcquisitionBudget { get; set; }
        public int? CompensationBudget { get; set; }
        public int? TotalBudget { get; set; }
        public string? Remarks { get; set; }
    }
}
