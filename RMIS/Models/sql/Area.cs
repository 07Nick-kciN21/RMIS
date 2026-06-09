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
    }
}
