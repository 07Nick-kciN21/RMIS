namespace RMIS.Models.API
{
    public class GetAreasByFocusLayerInput
    {
        public Guid id { get; set; }
        public DateTime startTime { get; set; }
        public DateTime endTime { get; set; }
    }
}
