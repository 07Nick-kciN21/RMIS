using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class IndexClass
    {
        public class LayersByPipeline
        {
            public string id { get; set; }
            public string name { get; set; }
            public string svg { get; set; }
        }

        public class PointsByLayer
        {
            public string id { get; set; }
            public string name { get; set; }
            public List<PointDto> points { get; set; }
        }
        public class PointDto
        {
            public int Index { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }
    }
}
