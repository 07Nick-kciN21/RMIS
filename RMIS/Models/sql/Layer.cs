namespace RMIS.Models.sql
{
    
    public class Layer
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public Guid GeometryTypeId { get; set; }
        public GeometryType GeometryType { get; set; }
        public Guid PipelineId { get; set; } // Func 的外鍵
        public Pipeline Pipeline { get; set; }
        public ICollection<Area> Areas { get; set; }
    }
}
