namespace RMIS.Models.sql
{
    public class GeometryType
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string Svg { get; set; } // svg�W��
        public int OrderId { get; set; } // �Ƨ�
        public string Kind { get; set; } // �I�B�u�B��
        public ICollection<Layer> Layers { get; set; }
    }
}
