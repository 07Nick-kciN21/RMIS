using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class AreasByLayer
    {
        public string id { get; set; }
        public string name { get; set; }
        public string color { get; set; }
        public string type { get; set; }
        public string svg { get; set; }
        public List<AreaDto> areas { get; set; }
    }
    public class AreaDto
    {
        public string id { get; set; }
        public string ConstructionUnit { get; set; }
        public List<PointDto> points { get; set; }
    }
    public class PointDto
    {
        public int Index { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
