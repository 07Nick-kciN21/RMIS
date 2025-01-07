namespace RMIS.Models.Admin
{
    public class RoadProjectProp
    {
        public string Proposer { get; set; }
        public string AdministrativeDistrict { get; set; }
        public string StartEndLocation { get; set; }
        public float RoadLength { get; set; }
        public string CurrentRoadWidth { get; set; }
        public string PlannedRoadWidth { get; set; }
        public int PublicLand { get; set; }
        public int PrivateLand { get; set; }
        public int PublicPrivateLand { get; set; }
        public int ConstructionBudget { get; set; }
        public int LandAcquisitionBudget { get; set; }
        public int CompensationBudget { get; set; }
        public int TotalBudget { get; set; }
        public string Remarks { get; set; }
    }
}
