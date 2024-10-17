using RMIS.Models.sql;
namespace RMIS.Models.API
{
    public class MapSourceOrderbyTileType
    {
        public List<MapSource> WMS { get; set; }
        public List<MapSource> WMTS { get; set; }
    }
}
