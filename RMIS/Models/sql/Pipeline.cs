namespace RMIS.Models.sql
{
    public class Pipeline
    {
        public Guid Id { get; set; } // 唯一識別碼
        public string Name { get; set; } // 管線名稱
        public string ManagementUnit { get; set; } // 管理單位
        public string Kind { get; set; } // 點、線、面
        public string Color { get; set; } // 顏色
        public Guid CategoryId { get; set; } // 管線Id
        public Category Category { get; set; } // 管線類別
        public ICollection<Layer> Layers { get; set; } // 多個圖層
    }
}
