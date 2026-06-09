using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class LayersByFocusPipeline
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<FocusLayer> Layers { get; set; }
    }

    public class FocusLayer
    {
        public int id { get; set; }
        public string name { get; set; }
        public string svg { get; set; }
    }
}
