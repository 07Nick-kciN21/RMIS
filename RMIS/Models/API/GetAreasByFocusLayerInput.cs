namespace RMIS.Models.API
{
    public class GetAreasByFocusLayerInput
    {
        public Guid id { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
    }
}
