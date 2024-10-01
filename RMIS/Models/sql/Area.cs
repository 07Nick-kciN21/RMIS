namespace RMIS.Models.sql
{
    public class Area
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string ConstructionUnit { get; set; } // 施工單位
        public Guid AdminDistId { get; set; }
        public AdminDist AdminDist { get; set; }
        public Guid LayerId { get; set; }
        public Layer Layer { get; set; }
        public ICollection<Point> Points { get; set; }
    }
}
