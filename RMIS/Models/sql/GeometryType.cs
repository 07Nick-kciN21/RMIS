namespace RMIS.Models.sql
{
    public class GeometryType
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string Svg { get; set; } // svg名稱
        public int OrderId { get; set; } // 排序
        public string Kind { get; set; } // 點、線、面
        public ICollection<Layer> Layers { get; set; }
    }
}
