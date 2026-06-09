namespace RMIS.Models.API
{
    public class GetAreasByFocusLayerInput
    {
        public int id { get; set; }
        public int ofType { get; set; }
        public DateTime startDate { get; set; }
        public DateTime endDate { get; set; }
    }
}
