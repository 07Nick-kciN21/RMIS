using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class PointsByProjectId
    {
        public List<rangeCoordinate> rangePoints { get; set; }
        public List<photoCoordinate> photoPoints { get; set; }
    }

    public class rangeCoordinate
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Prop { get; set; }
        public int Index { get; set; }
    }

    public class photoCoordinate
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string url { get; set; }
    }
}
