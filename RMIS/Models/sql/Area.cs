namespace RMIS.Models.sql
{
    public class Area
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string ConstructionUnit { get; set; } // 施工單位
        public int AdminDistId { get; set; }
        public AdminDist AdminDist { get; set; }
        public int LayerId { get; set; }
        public Layer Layer { get; set; }
        public ICollection<Point> Points { get; set; }

        // 由 DB trigger（trg_Points_SyncAreaBBox）依 Points 自動維護，應用程式不寫入
        public NetTopologySuite.Geometries.Geometry? BBox { get; set; }
    }
}
