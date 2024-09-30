using RMIS.Models.sql;

namespace RMIS.Models.AreaModel
{
    public class AreaClass
    {
        public class Area
        {
            public Guid Id { get; set; }
            public string Name { get; set; }
            public string Color { get; set; }
            public ICollection<View_input> Points { get; set; }
        }
        public class View
        {
            public Guid Id { get; set; }
            public string Name { get; set; }
            public string Color { get; set; }
            public ICollection<View_input> Points { get; set; }
        }
        public class IndexView
        {
            public List<Area> areas { get; set; }
            public string color { get; set; }
        }

        public class View_input
        {
            public int Index { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }

        public class AddInput
        {
            public Guid Id { get; set; }
            public string City { get; set; }
            public string Town { get; set; }
            public string Name { get; set; }
            public ICollection<Point> Points { get; set; }
        }
    }
}
