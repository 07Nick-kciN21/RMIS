using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class IndexClass
    {
        public class LayersByPipeline
        {
            public string Name { get; set; }
            public Guid Id { get; set; }
            public List<LayerData> Layers { get; set; }
        }
        public class LayerData {
            public Guid Id { get; set; }
            public string Name { get; set; }
            public List<Area> Areas { get; set; }
        }
    }
}
