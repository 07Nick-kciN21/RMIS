namespace RMIS.Models.sql
{
    public class Area
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string ConstructionUnit { get; set; } // 施工單位
        public Guid AdminDistId { get; set; }
        public AdminDist AdminDist { get; set; }
        public Guid PipelineId { get; set; } // Func 的外鍵
        public Pipeline Pipeline { get; set; }
        public ICollection<Point> Points { get; set; }
    }
}
