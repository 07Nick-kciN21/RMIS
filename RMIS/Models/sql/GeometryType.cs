namespace RMIS.Models.sql
{
    public class GeometryType
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string Svg { get; set; } // svg�W��
        public int OrderId { get; set; } // �Ƨ�
        public string Kind { get; set; } // �I�B�u�B��
        public string? Color { get; set; } // �C��
        public ICollection<Layer> Layers { get; set; }
    }
}
