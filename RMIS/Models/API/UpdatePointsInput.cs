using RMIS.Models.Admin;

namespace RMIS.Models.API
{
    public class UpdatePointsInput
    {
        public int ProjectId { get; set; }
        public List<range> RangePoints { get; set; } = new();
        public List<photo> PhotoPoints { get; set; } = new();
    }
}

