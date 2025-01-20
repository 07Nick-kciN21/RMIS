using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class LayersByFocusPipeline
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public List<FocusLayer> Layers { get; set; }
    }

    public class FocusLayer
    {
        public Guid id { get; set; }
        public string name { get; set; }
        public string svg { get; set; }
    }
}
