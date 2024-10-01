namespace RMIS.Models.RoadModel
{
    public class RoadClass
    {
        public class point
        {
            public int Index { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }
        public class RoadData
        {
            public Guid Id { get; set; }
            public string Name { get; set; }
            public ICollection<point> Points { get; set; }
        }
        public class IndexView
        {
            public List<RoadData> roads { get; set; }
            public string color { get; set; }
        }

        public class AddInput
        {
            public Guid Id { get; set; }
            public string City { get; set; }
            public string Town { get; set; }
            public string Name { get; set; }
            public ICollection<point> Points { get; set; }
        }
    }
}
