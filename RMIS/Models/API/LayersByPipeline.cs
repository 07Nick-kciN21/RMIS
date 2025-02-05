using RMIS.Models.sql;

namespace RMIS.Models.API
{
    public class LayersByPipeline
    {
        public List<LayerByPipe> layers { get; set; }
        public MetaData metaData { get; set; }
    }
    public class LayerByPipe
    {
        public string id { get; set; }
        public string name { get; set; }
        public string svg { get; set; }
    }
}
