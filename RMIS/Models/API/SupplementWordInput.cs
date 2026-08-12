namespace RMIS.Models.API
{
    public class SupplementWordInput
    {
        public string? ProjectId { get; set; }
        public string ProjectName { get; set; } = "";
        public string ExecutionUnit { get; set; } = "";
        public string Proposer { get; set; } = "";
        public string CurrentStatus { get; set; } = "";
        public string RoadLength { get; set; } = "";
        public string CurrentRoadWidth { get; set; } = "";
        public string PlannedRoadWidth { get; set; } = "";
        public string ConstructionBudget { get; set; } = "";
        public string LandAcquisitionBudget { get; set; } = "";
        public string TotalBudget { get; set; } = "";
        public string StartDate { get; set; } = "";
        public string EndDate { get; set; } = "";
        // 用地取得資訊
        public string PublicHearing { get; set; } = "";
        public string MarketPriceReview { get; set; } = "";
        public string NegotiatedPurchaseMeeting { get; set; } = "";
        public string ExpropriationPlanPreReview { get; set; } = "";
        public string ExpropriationPlanSubmission { get; set; } = "";
        public string ExpropriationApproval { get; set; } = "";
        public string? ImageBase64 { get; set; }
    }
}
