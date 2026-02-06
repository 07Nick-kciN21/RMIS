using RMIS.Models.Admin;

namespace RMIS.Models.API
{
    public class UpdatePointsInput
    {
        public Guid ProjectId { get; set; }
        public List<range> RangePoints { get; set; } = new();
        public List<photo> PhotoPoints { get; set; } = new();
    }
}
