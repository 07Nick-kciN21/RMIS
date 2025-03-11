using RMIS.Models.Auth;

namespace RMIS.Models.sql
{
    public class Pipeline
    {
        public Guid Id { get; set; } // 唯一識別碼
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        // public string Kind { get; set; } // 點、線、面
        // public string? Color { get; set; } // 顏色
        public Guid CategoryId { get; set; } // 管線Id
        public Category Category { get; set; } // 管線階層
        public ICollection<Layer> Layers { get; set; } // 多個圖層
        // 允許存取的部門 (可多個)
        public List<int> DepartmentIds { get; set; } = new();
        public Guid MetaId { get; set; } // 圖資Id
        public MetaData? MetaData { get; set; } // 圖資
    }
}
